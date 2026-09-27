import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import Document from '../models/Document.js';
import Workspace from '../models/Workspace.js';
import axios from 'axios';
import FormData from 'form-data';
import fsSync from 'fs';
import { databaseMode } from '../config/db.js';
import {
  createDocument as createLocalDocument,
  deleteDocumentById,
  findDocumentById,
  listDocumentsByUser,
} from '../services/localStore.js';
import { env } from '../config/env.js';

function buildDocumentResponse(document) {
  return {
    id: document._id,
    title: document.title,
    filename: document.filename,
    originalName: document.originalName,
    filePath: document.filePath,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    pages: document.pages,
    uploadStatus: document.uploadStatus,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function toReadableFileSize(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function extractTitleFromFilename(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

async function extractPdfText(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const parsed = await pdfParse(fileBuffer);

  return {
    text: parsed.text || '',
    pages: parsed.numpages || 0,
  };
}

function buildSummary(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();

  if (!cleanText) {
    return '';
  }

  return cleanText.slice(0, 280);
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

export async function uploadDocument(req, res) {
  console.log('[UPLOAD] Express uploadDocument invoked');
  if (!req.file) {
    console.log('[UPLOAD] No file in request');
    return res.status(400).json({ message: 'A PDF file is required' });
  }
  console.log('[UPLOAD] req.file:', { originalname: req.file.originalname, size: req.file.size, fieldname: req.file.fieldname });

  const title = req.body.title?.trim() || extractTitleFromFilename(req.file.originalname);
  const relativePath = path.posix.join('/uploads', req.file.filename).replace(/\\/g, '/');
  const absolutePath = path.join(process.cwd(), 'uploads', req.file.filename);
  // Confirm file exists and can be read
  try {
    await fs.access(absolutePath);
  } catch (err) {
    console.error('[UPLOAD] File not found on disk:', absolutePath, err);
    return res.status(500).json({ message: 'Uploaded file not found on server' });
  }

  const extractedPdf = await extractPdfText(absolutePath);
  const extractedText = extractedPdf.text.trim();
  const workspaceId = await resolveWorkspaceId(req);

  if (databaseMode.current === 'local') {
    const document = await createLocalDocument({
      owner: req.user._id,
      workspace: workspaceId,
      title,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: relativePath,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      pages: extractedPdf.pages,
      extractedText,
      summary: buildSummary(extractedText),
      uploadStatus: 'ready',
      processedAt: new Date().toISOString(),
    });

    // Notify AI service to index this file
    try {
      const form = new FormData();
      form.append('file', fsSync.createReadStream(absolutePath));
      form.append('title', title);
      if (workspaceId) form.append('workspace_id', String(workspaceId));

      console.log('[UPLOAD] Sending file to AI service for indexing:', env.aiServiceUrl + '/api/upload');
      const aiResp = await axios.post(`${env.aiServiceUrl}/api/upload`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000,
      });
      console.log('[UPLOAD] AI service response:', aiResp.status, aiResp.data?.message || 'no message');
    } catch (err) {
      console.error('[UPLOAD] Failed to notify AI service:', err?.response?.data || err.message || err);
    }

    return res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document._id,
        title: document.title,
        filename: document.filename,
        originalName: document.originalName,
        filePath: document.filePath,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        pages: document.pages,
        uploadStatus: document.uploadStatus,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        fileSizeLabel: toReadableFileSize(document.fileSize),
        downloadUrl: relativePath,
      },
    });
  }

  const document = await Document.create({
    owner: req.user._id,
    workspace: workspaceId,
    title,
    filename: req.file.filename,
    originalName: req.file.originalname,
    filePath: relativePath,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    pages: extractedPdf.pages,
    extractedText,
    summary: buildSummary(extractedText),
    uploadStatus: 'ready',
    processedAt: new Date(),
  });

  // Notify AI service to index this file (DB mode)
  try {
    const form = new FormData();
    form.append('file', fsSync.createReadStream(absolutePath));
    form.append('title', title);
    if (workspaceId) form.append('workspace_id', String(workspaceId));

    console.log('[UPLOAD] Sending file to AI service for indexing:', env.aiServiceUrl + '/api/upload');
    const aiResp = await axios.post(`${env.aiServiceUrl}/api/upload`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000,
    });
    console.log('[UPLOAD] AI service response:', aiResp.status, aiResp.data?.message || 'no message');
  } catch (err) {
    console.error('[UPLOAD] Failed to notify AI service:', err?.response?.data || err.message || err);
  }

  return res.status(201).json({
    message: 'Document uploaded successfully',
    document: {
      ...buildDocumentResponse(document),
      fileSizeLabel: toReadableFileSize(document.fileSize),
      downloadUrl: relativePath,
    },
  });
}

export async function getDocuments(req, res) {
  if (databaseMode.current === 'local') {
    const workspaceId = req.query.workspaceId || req.user.defaultWorkspace;
    const documents = await listDocumentsByUser(req.user._id, workspaceId || null);
    return res.status(200).json({
      documents: documents.map((document) => ({
        id: document._id,
        title: document.title,
        filename: document.filename,
        originalName: document.originalName,
        filePath: document.filePath,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        pages: document.pages,
        uploadStatus: document.uploadStatus,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        fileSizeLabel: toReadableFileSize(document.fileSize),
        downloadUrl: document.filePath,
      })),
    });
  }

  const workspaceId = req.query.workspaceId || req.user.defaultWorkspace;
  const filter = { owner: req.user._id };

  if (workspaceId) {
    filter.workspace = workspaceId;
  }

  const documents = await Document.find(filter).sort({ createdAt: -1 });

  return res.status(200).json({
    documents: documents.map((document) => ({
      ...buildDocumentResponse(document),
      fileSizeLabel: toReadableFileSize(document.fileSize),
      downloadUrl: document.filePath,
    })),
  });
}

export async function deleteDocument(req, res) {
  if (databaseMode.current === 'local') {
    const document = await findDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    const isOwner = String(document.owner) === String(req.user._id);
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Insufficient permissions to delete this document' });
    }

    const absolutePath = path.join(process.cwd(), 'uploads', document.filename);
    await fs.rm(absolutePath, { force: true });
    await deleteDocumentById(req.params.id);

    return res.status(200).json({ message: 'Document deleted successfully' });
  }

  const document = await Document.findById(req.params.id);

  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }

  const isOwner = document.owner.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'Admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Insufficient permissions to delete this document' });
  }

  const absolutePath = path.join(process.cwd(), 'uploads', document.filename);
  await fs.rm(absolutePath, { force: true });
  await document.deleteOne();

  return res.status(200).json({ message: 'Document deleted successfully' });
}