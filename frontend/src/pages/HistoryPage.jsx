import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getChatHistory } from '../services/chatService';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const { selectedWorkspaceId } = useAuth();

  useEffect(() => {
    getChatHistory(selectedWorkspaceId).then((data) => setHistory(data.history || [])).catch(() => setHistory([]));
  }, [selectedWorkspaceId]);

  return (
    <section className="medical-shell rounded-[2rem] p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-slate-950">Chat History</h2>
      <div className="mt-6 space-y-4">
        {history.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-5">
            <p className="font-semibold text-slate-950">{item.question}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
            <div className="mt-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
          </article>
        ))}
        {!history.length ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No chat history available.</p> : null}
      </div>
    </section>
  );
}