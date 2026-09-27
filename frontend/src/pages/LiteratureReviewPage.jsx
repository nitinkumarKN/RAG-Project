import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaBookOpen, FaFileAlt } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { listDocuments } from '../services/documentService';
import { sendChatMessage } from '../services/chatService';

export default function LiteratureReviewPage() {
  const { selectedWorkspaceId } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [topic, setTopic] = useState('');
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDocuments(selectedWorkspaceId)
      .then((data) => setDocuments(data.documents || []))
      .catch(() => setDocuments([]));
  }, [selectedWorkspaceId]);

  const documentSummary = useMemo(() => documents.slice(0, 6).map((document) => document.title).join(', '), [documents]);

  async function handleGenerate(event) {
    event.preventDefault();

    if (!documents.length) {
      toast.error('Upload papers before generating a review');
      return;
    }

    setLoading(true);
    setReview('');

    try {
      const prompt = [
        `Write a short literature review for the current workspace around this topic: ${topic.trim() || 'the uploaded research set'}.`,
        `Use the following paper titles as the available evidence base: ${documentSummary}.`,
        'Organize the response into themes, evidence gaps, and a practical takeaway. Be transparent when the evidence is limited.',
      ].join('\n');

      const data = await sendChatMessage({ question: prompt, workspaceId: selectedWorkspaceId });
      setReview(data.answer || 'No review was returned.');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to generate literature review');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <FaBookOpen />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">Literature Review</p>
            <h2 className="text-2xl font-semibold text-slate-950">Workspace-aware review draft</h2>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Review topic</span>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. sepsis biomarkers or lung cancer screening" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" />
          </label>

          <button disabled={loading || !documents.length} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
            <FaBookOpen /> {loading ? 'Generating...' : 'Generate Review'}
          </button>
        </form>

        <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          This draft stays anchored to the papers already uploaded into the active workspace.
        </p>
      </div>

      <div className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <FaFileAlt className="text-2xl text-emerald-600" />
          <div>
            <h3 className="text-xl font-semibold text-slate-950">Review draft</h3>
            <p className="text-sm text-slate-500">Readable, citation-friendly output for research workflows.</p>
          </div>
        </div>

        {review ? (
          <div className="markdown-content mt-5 rounded-3xl border border-slate-100 bg-white p-5 text-sm leading-7 text-slate-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{review}</ReactMarkdown>
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Generate a review to summarize the selected workspace’s paper set.
          </p>
        )}
      </div>
    </section>
  );
}