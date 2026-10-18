import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { FaPaperPlane, FaTrash } from 'react-icons/fa';
import { clearChatHistory, getChatHistory, sendChatMessage } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

function MessageBubble({ message, user }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl rounded-3xl px-4 py-3 ${isUser ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
        <div className="markdown-content text-sm leading-7">
          {isUser ? message.content : <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>}
        </div>
        <div className={`mt-2 text-[11px] ${isUser ? 'text-blue-100' : 'text-slate-400'}`}>
          {new Date(message.timestamp).toLocaleString()}
        </div>
        {!isUser && message.sources?.length ? (
          <div className="mt-3 space-y-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-slate-700">
            <p className="font-semibold text-blue-700">Sources</p>
            {message.sources.map((source, index) => (
              <div key={`${source.documentName}-${index}`}>
                <p>{source.documentName} • Page {source.pageNumber ?? 'N/A'}</p>
                <p className="text-slate-500">{source.excerpt}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { selectedWorkspaceId } = useAuth();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatHistory(selectedWorkspaceId).then((data) => {
      const history = (data.history || []).flatMap((item) => [
        { role: 'user', content: item.question, timestamp: item.createdAt },
        { role: 'assistant', content: item.answer, timestamp: item.updatedAt || item.createdAt, sources: item.sources },
      ]);
      setMessages(history);
    }).catch(() => setMessages([]));
  }, [selectedWorkspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!question.trim()) return;

    const userMessage = { role: 'user', content: question.trim(), timestamp: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const data = await sendChatMessage({ question: userMessage.content, workspaceId: selectedWorkspaceId });
      const answer = data.answer ?? data.chat?.answer;
      const sources = Array.isArray(data.sources)
        ? data.sources
        : (Array.isArray(data.chat?.sources) ? data.chat.sources : []);

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: typeof answer === 'string' ? answer : 'The AI service returned an empty answer.',
          timestamp: data.chat?.createdAt || new Date().toISOString(),
          sources,
        },
      ]);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to send question');
      setMessages((current) => current.filter((entry) => entry !== userMessage));
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Clear all chat history?')) return;
    try {
      await clearChatHistory(selectedWorkspaceId);
      setMessages([]);
      toast.success('Chat history cleared');
    } catch {
      toast.error('Unable to clear history');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="medical-shell flex h-[76vh] flex-col rounded-[2rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Chat</h2>
            <p className="text-sm text-slate-500">Ask questions and get cited answers from uploaded papers.</p>
          </div>
          <button onClick={handleClearHistory} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            <FaTrash /> Clear
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto py-5">
          {messages.length ? messages.map((message, index) => <MessageBubble key={`${message.role}-${index}`} message={message} />) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">Ask your first question to start a conversation.</p>}
          {loading ? <div className="rounded-3xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">AI is thinking...</div> : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-3 rounded-3xl border border-slate-200 bg-white p-3">
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} placeholder="Ask a medical research question..." className="min-h-[56px] flex-1 resize-none border-none px-2 py-3 outline-none" />
          <button disabled={loading} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            <FaPaperPlane /> Send
          </button>
        </form>
      </section>

      <aside className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-slate-950">Chat Rules</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>• Answers are grounded in uploaded papers only</li>
          <li>• Citations appear below every AI answer</li>
          <li>• No supported answer triggers a refusal message</li>
          <li>• Chat history is saved in MongoDB</li>
        </ul>

        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This project is for educational purposes only and should not be used for medical diagnosis.
        </p>
      </aside>
    </div>
  );
}