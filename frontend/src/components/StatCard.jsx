export default function StatCard({ label, value, helper, tone = 'blue' }) {
  const tones = {
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    slate: 'from-slate-700 to-slate-900',
  };

  return (
    <div className="medical-shell rounded-3xl p-5">
      <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${tones[tone]}`} />
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <h3 className="text-3xl font-bold tracking-tight text-slate-950">{value}</h3>
      </div>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </div>
  );
}