import { useEffect, useState } from 'react';
import { FaUsers, FaLayerGroup, FaFileAlt, FaComments, FaChartPie } from 'react-icons/fa';
import StatCard from '../components/StatCard';
import { getAnalytics } from '../services/adminService';

function RoleBar({ label, value, total }) {
  const width = total ? Math.max(8, Math.round((value * 100) / total)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getAnalytics().then((data) => setAnalytics(data.analytics || null)).catch(() => setAnalytics(null));
  }, []);

  const totals = analytics?.totals || {};
  const recent = analytics?.recent || {};
  const usersByRole = analytics?.usersByRole || {};
  const totalRoles = Object.values(usersByRole).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Admin Analytics</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Operational overview for the SaaS workspace</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">Track adoption, document volume, and collaboration usage from one control surface.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={totals.users || 0} helper="Registered accounts in the system" tone="blue" />
        <StatCard label="Workspaces" value={totals.workspaces || 0} helper="Total collaborative spaces" tone="emerald" />
        <StatCard label="Documents" value={totals.documents || 0} helper="Uploaded research papers" tone="amber" />
        <StatCard label="Chats" value={totals.chats || 0} helper="LLM-backed research questions" tone="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="medical-shell rounded-[2rem] p-6">
          <div className="flex items-center gap-3">
            <FaChartPie className="text-2xl text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-slate-950">User role distribution</h3>
              <p className="text-sm text-slate-500">Who is using the platform right now.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {Object.keys(usersByRole).length ? (
              Object.entries(usersByRole).map(([role, value]) => <RoleBar key={role} label={role} value={value} total={totalRoles} />)
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No user data yet.</p>
            )}
          </div>
        </section>

        <section className="medical-shell rounded-[2rem] p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <FaUsers className="text-xl text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">Active workspaces</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{totals.activeWorkspaces || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <FaLayerGroup className="text-xl text-emerald-600" />
              <p className="mt-3 text-sm text-slate-500">Recent workspaces</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{totals.workspaces || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <FaFileAlt className="text-xl text-amber-600" />
              <p className="mt-3 text-sm text-slate-500">Documents in last 7 days</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{recent.documents || 0}</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <FaComments className="text-xl text-slate-700" />
              <p className="mt-3 text-sm text-slate-500">Chats in last 7 days</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{recent.chats || 0}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}