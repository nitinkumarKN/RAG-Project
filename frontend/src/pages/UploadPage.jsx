import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaCloudUploadAlt, FaFilePdf } from 'react-icons/fa';
import { uploadDocument } from '../services/documentService';
import { useAuth } from '../context/AuthContext';

export default function UploadPage() {
  const { selectedWorkspaceId } = useAuth();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (selectedWorkspaceId) {
      formData.append('workspaceId', selectedWorkspaceId);
    }
    if (title.trim()) formData.append('title', title.trim());

    setLoading(true);
    try {
      await uploadDocument(formData, (eventData) => {
        if (eventData.total) {
          setProgress(Math.round((eventData.loaded * 100) / eventData.total));
        }
      });
      toast.success('PDF uploaded successfully');
      setFile(null);
      setTitle('');
      setProgress(0);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-950">Upload PDF Research Paper</h2>
        <p className="mt-2 text-sm text-slate-500">PDF only, max 20 MB. The backend extracts the text and stores metadata.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Paper Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400" placeholder="Optional custom title" />
          </label>

          <label className="block rounded-[1.5rem] border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
            <input type="file" accept="application/pdf" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <FaCloudUploadAlt className="mx-auto text-5xl text-blue-500" />
            <p className="mt-4 text-lg font-semibold text-slate-950">Drag and drop your PDF</p>
            <p className="mt-1 text-sm text-slate-500">or click to choose a file</p>
            {file ? <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"><FaFilePdf className="text-red-500" /> {file.name}</div> : null}
          </label>

          {loading ? (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-slate-500">Uploading... {progress}%</p>
            </div>
          ) : null}

          <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700">
            {loading ? 'Uploading...' : 'Upload Paper'}
          </button>
        </form>
      </section>

      <aside className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-slate-950">Upload Rules</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>• PDF files only</li>
          <li>• Maximum file size: 20 MB</li>
          <li>• Metadata saved to MongoDB</li>
          <li>• Text extracted on the backend</li>
          <li>• Documents remain user-scoped</li>
        </ul>

        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This project is for educational purposes only and should not be used for medical diagnosis.
        </p>
      </aside>
    </div>
  );
}