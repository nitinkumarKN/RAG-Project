import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaDownload, FaTrash, FaFilePdf } from "react-icons/fa";
import { deleteDocument, listDocuments } from "../services/documentService";
import { resolveApiUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function PapersPage() {
  const { selectedWorkspaceId } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");

  async function loadDocuments() {
    const data = await listDocuments(selectedWorkspaceId);
    setDocuments(data.documents || []);
  }

  useEffect(() => {
    loadDocuments().catch(() => setDocuments([]));
  }, [selectedWorkspaceId]);

  async function handleDelete(id) {
    if (!window.confirm("Delete this paper?")) return;
    try {
      await deleteDocument(id);
      toast.success("Paper deleted");
      loadDocuments();
    } catch {
      toast.error("Unable to delete paper");
    }
  }

  const filtered = documents.filter((document) =>
    [document.title, document.originalName].some((value) =>
      value?.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  return (
    <section className="medical-shell rounded-[2rem] p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">My Papers</h2>
          <p className="text-sm text-slate-500">
            Search, preview, download, and delete your uploaded documents.
          </p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by paper name"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-400"
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((document) => (
          <article
            key={document.id}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FaFilePdf />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">
                    {document.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {document.originalName}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {document.pages || 0} pages
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600">
              <p>File Size: {document.fileSizeLabel}</p>
              <p>Uploaded: {new Date(document.createdAt).toLocaleString()}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={
                  resolveApiUrl(document.downloadUrl)
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
              >
                <FaDownload /> Preview
              </a>
              <button
                onClick={() => handleDelete(document.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              >
                <FaTrash /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filtered.length ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          No papers found.
        </p>
      ) : null}
    </section>
  );
}
