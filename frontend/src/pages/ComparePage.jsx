import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaBalanceScale, FaFileAlt } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { listDocuments } from '../services/documentService';
import { sendChatMessage } from '../services/chatService';

export default function ComparePage() {
  const { selectedWorkspaceId } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [comparison, setComparison] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDocuments(selectedWorkspaceId)
      .then((data) => {
        const nextDocuments = data.documents || [];
        setDocuments(nextDocuments);
        setLeftId((current) => current || nextDocuments[0]?.id || '');
        setRightId((current) => current || nextDocuments[1]?.id || nextDocuments[0]?.id || '');
      })
      .catch(() => setDocuments([]));
  }, [selectedWorkspaceId]);

  const selectedDocuments = useMemo(() => {
    const leftDocument = documents.find((document) => document.id === leftId);
    const rightDocument = documents.find((document) => document.id === rightId);
    return { leftDocument, rightDocument };
  }, [documents, leftId, rightId]);

  async function handleCompare(event) {
    event.preventDefault();

    if (!selectedDocuments.leftDocument || !selectedDocuments.rightDocument) {
      toast.error('Select two papers to compare');
      return;
    }

    if (selectedDocuments.leftDocument.id === selectedDocuments.rightDocument.id) {
      toast.error('Choose two different papers');
      return;
    }

    setLoading(true);
    setComparison('');

    try {
      const prompt = [
        `Compare these two papers from the current workspace in a structured, concise way:`,
        `Paper A: ${selectedDocuments.leftDocument.title} (${selectedDocuments.leftDocument.originalName})`,
        `Paper B: ${selectedDocuments.rightDocument.title} (${selectedDocuments.rightDocument.originalName})`,
        'Focus on research question, methodology, likely strengths, likely limitations, and practical takeaway. If evidence is missing, say so explicitly.',
      ].join('\n');

      const data = await sendChatMessage({ question: prompt, workspaceId: selectedWorkspaceId });
      setComparison(data.answer || 'No comparison was returned.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to generate comparison');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <FaBalanceScale />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Compare Papers</p>
            <h2 className="text-2xl font-semibold text-slate-950">Side-by-side research comparison</h2>
          </div>
        </div>

        <form onSubmit={handleCompare} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Paper A</span>
            <select value={leftId} onChange={(event) => setLeftId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none">
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Paper B</span>
            <select value={rightId} onChange={(event) => setRightId(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none">
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>

          <button disabled={loading || documents.length < 2} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
            <FaBalanceScale /> {loading ? 'Comparing...' : 'Compare Papers'}
          </button>
        </form>

        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This uses the workspace RAG pipeline to draft a comparison from the uploaded paper set.
        </p>
      </div>

      <div className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <FaFileAlt className="text-2xl text-blue-600" />
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Comparison output</h3>
            <p className="text-sm text-slate-500">A concise summary tailored to the selected workspace.</p>
          </div>
        </div>

        {comparison ? (
          <div className="markdown-content mt-5 rounded-3xl border border-slate-100 bg-white p-5 text-sm leading-7 text-slate-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{comparison}</ReactMarkdown>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Select two papers and generate a structured comparison.
          </p>
        )}
      </div>
    </section>
  );
}