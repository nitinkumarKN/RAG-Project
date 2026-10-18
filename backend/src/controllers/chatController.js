import Chat from '../models/Chat.js';
import Document from '../models/Document.js';
import Workspace from '../models/Workspace.js';
import { askAiService } from '../services/aiServiceClient.js';
import { databaseMode } from '../config/db.js';
import {
  createChat as createLocalChat,
  deleteChatsByUser,
  listChatsByUser,
  listDocumentsByUser,
} from '../services/localStore.js';

function formatChat(chat) {
  return {
    id: chat._id,
    question: chat.question,
    answer: chat.answer,
    confidenceMessage: chat.confidenceMessage,
    sources: chat.sources,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
}

function buildDocumentPayload(document) {
  return {
    documentId: document._id,
    workspaceId: document.workspace,
    title: document.title,
    filename: document.filename,
    originalName: document.originalName,
    pages: document.pages,
    extractedText: document.extractedText || document.summary || '',
  };
}

function buildFallbackAnswer() {
  return {
    answer: 'I could not find this information in the uploaded medical papers.',
    confidenceMessage: 'No supporting evidence was retrieved from the uploaded documents.',
    sources: [],
  };
}

async function resolveWorkspaceId(req) {
  const workspaceId = req.body.workspaceId || req.query.workspaceId || req.user.defaultWorkspace;

  if (!workspaceId) {
    return null;
  }

  const workspace = await Workspace.findOne({
    _id: workspaceId,
    $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
  });

  return workspace ? workspace._id : null;
}

export async function createChat(req, res) {
  const question = req.body.question?.trim();

  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }

  if (databaseMode.current === 'local') {
    const workspaceId = req.body.workspaceId || req.query.workspaceId || req.user.defaultWorkspace;
    const documents = await listDocumentsByUser(req.user._id, workspaceId || null);

    if (!documents.length) {
      const fallback = buildFallbackAnswer();
      const chat = await createLocalChat({
        user: req.user._id,
        workspace: workspaceId,
        question,
        answer: fallback.answer,
        confidenceMessage: fallback.confidenceMessage,
        sources: [],
      });

      return res.status(200).json({
        chat: formatChat(chat),
        ...fallback,
      });
    }

    try {
      console.log('[CHAT] Sending question to AI service. workspaceId=', workspaceId, 'documents=', documents.length);
      const aiResponse = await askAiService(question, documents.map(buildDocumentPayload));
      const answer = aiResponse.answer || buildFallbackAnswer().answer;
      const confidenceMessage = aiResponse.confidenceMessage || buildFallbackAnswer().confidenceMessage;
      const sources = Array.isArray(aiResponse.sources) ? aiResponse.sources : [];
      const chat = await createLocalChat({
        user: req.user._id,
        workspace: workspaceId,
        question,
        answer,
        confidenceMessage,
        sources,
      });

      return res.status(200).json({
        chat: formatChat(chat),
        answer,
        confidenceMessage,
        sources,
      });
    } catch (err) {
      console.error('[CHAT] AI service request failed:', err?.response?.data || err.message || err);
      const fallback = buildFallbackAnswer();
      const chat = await createLocalChat({
        user: req.user._id,
        workspace: workspaceId,
        question,
        answer: fallback.answer,
        confidenceMessage: fallback.confidenceMessage,
        sources: fallback.sources,
      });

      return res.status(200).json({
        chat: formatChat(chat),
        ...fallback,
      });
    }
  }

  const workspaceId = await resolveWorkspaceId(req);
  const filter = { owner: req.user._id, uploadStatus: 'ready' };

  if (workspaceId) {
    filter.workspace = workspaceId;
  }

  const documents = await Document.find(filter).sort({ createdAt: -1 });

  if (!documents.length) {
    const fallback = buildFallbackAnswer();
    const chat = await Chat.create({
      user: req.user._id,
      workspace: workspaceId,
      question,
      answer: fallback.answer,
      confidenceMessage: fallback.confidenceMessage,
      sources: [],
    });

    return res.status(200).json({
      chat: formatChat(chat),
      ...fallback,
    });
  }

  try {
    console.log('[CHAT] Sending question to AI service. workspaceId=', workspaceId, 'documents=', documents.length);
    const aiResponse = await askAiService(question, documents.map(buildDocumentPayload));

    const answer = aiResponse.answer || buildFallbackAnswer().answer;
    const confidenceMessage = aiResponse.confidenceMessage || buildFallbackAnswer().confidenceMessage;
    const sources = Array.isArray(aiResponse.sources) ? aiResponse.sources : [];

    const chat = await Chat.create({
      user: req.user._id,
      workspace: workspaceId,
      question,
      answer,
      confidenceMessage,
      sources,
    });

    return res.status(200).json({
      chat: formatChat(chat),
      answer,
      confidenceMessage,
      sources,
    });
  } catch (err) {
    console.error('[CHAT] AI service request failed:', err?.response?.data || err.message || err);
    const fallback = buildFallbackAnswer();
    const chat = await Chat.create({
      user: req.user._id,
      workspace: workspaceId,
      question,
      answer: fallback.answer,
      confidenceMessage: fallback.confidenceMessage,
      sources: fallback.sources,
    });

    return res.status(200).json({
      chat: formatChat(chat),
      ...fallback,
    });
  }
}

export async function getChatHistory(req, res) {
  if (databaseMode.current === 'local') {
    const workspaceId = req.query.workspaceId || req.user.defaultWorkspace;
    return res.status(200).json({
      history: (await listChatsByUser(req.user._id, workspaceId || null)).map(formatChat),
    });
  }

  const workspaceId = req.query.workspaceId || req.user.defaultWorkspace;
  const filter = { user: req.user._id };

  if (workspaceId) {
    filter.workspace = workspaceId;
  }

  const chats = await Chat.find(filter).sort({ createdAt: -1 });

  return res.status(200).json({
    history: chats.map(formatChat),
  });
}

export async function deleteChatHistory(req, res) {
  if (databaseMode.current === 'local') {
    const workspaceId = req.query.workspaceId || req.user.defaultWorkspace;
    await deleteChatsByUser(req.user._id, workspaceId || null);
    return res.status(200).json({ message: 'Chat history deleted successfully' });
  }

  const workspaceId = req.query.workspaceId || req.user.defaultWorkspace;
  const filter = { user: req.user._id };

  if (workspaceId) {
    filter.workspace = workspaceId;
  }

  await Chat.deleteMany(filter);

  return res.status(200).json({ message: 'Chat history deleted successfully' });
}