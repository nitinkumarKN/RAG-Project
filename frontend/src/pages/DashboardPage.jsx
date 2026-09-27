import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaComments, FaFileAlt, FaUpload } from 'react-icons/fa';
import StatCard from '../components/StatCard';
import { listDocuments } from '../services/documentService';
import { getChatHistory } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const { user, selectedWorkspaceId } = useAuth();

  useEffect(() => {
    const workspaceId = selectedWorkspaceId || user?.defaultWorkspace || '';
    listDocuments(workspaceId).then((data) => setDocuments(data.documents || [])).catch(() => setDocuments([]));
    getChatHistory(workspaceId).then((data) => setHistory(data.history || [])).catch(() => setHistory([]));
  }, [selectedWorkspaceId, user?.defaultWorkspace]);

  const totalQuestions = history.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Total Papers" value={documents.length} helper="All uploaded medical research papers" tone="blue" />
        <StatCard label="Total Questions" value={totalQuestions} helper="Questions asked across your workspace" tone="emerald" />
        <StatCard label="Recent Chats" value={Math.min(history.length, 5)} helper="Latest chat interactions and citations" tone="amber" />
      </div>

      <div className="medical-shell rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Workspace Overview</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{user?.defaultWorkspace ? 'Primary workspace active' : 'Create a workspace to organize research'}</h2>
          </div>
          <span className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {user?.role || 'User'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="medical-shell rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Recent Uploads</h2>
              <p className="text-sm text-slate-500">The latest documents in your research library.</p>
            </div>
            <Link to="/dashboard/upload" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              <FaUpload /> Upload
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {documents.slice(0, 5).map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                <div>
                  <p className="font-semibold text-slate-950">{document.title}</p>
                  <p className="text-sm text-slate-500">{document.originalName} • {document.fileSizeLabel}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{document.uploadStatus}</span>
              </div>
            ))}
            {!documents.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No papers uploaded yet.</p> : null}
          </div>
        </section>

        <section className="medical-shell rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Recent Chats</h2>
              <p className="text-sm text-slate-500">Your latest document-grounded questions.</p>
            </div>
            <Link to="/dashboard/chat" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <FaComments /> Chat
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <p className="font-medium text-slate-950">{item.question}</p>
                <p className="mt-2 text-sm text-slate-500 line-clamp-3">{item.answer}</p>
              </div>
            ))}
            {!history.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No chat history yet.</p> : null}
          </div>
        </section>
      </div>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        This project is for educational purposes only and should not be used for medical diagnosis.
      </p>
    </div>
  );
}