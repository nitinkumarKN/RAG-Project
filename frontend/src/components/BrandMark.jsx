import { FaNotesMedical } from 'react-icons/fa';

export default function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
        <FaNotesMedical className="text-lg" />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">MedRAG</p>
        <p className="text-sm text-slate-500">AI Medical Research Assistant</p>
      </div>
    </div>
  );
}