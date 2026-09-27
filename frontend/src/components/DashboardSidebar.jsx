import { NavLink } from 'react-router-dom';
import { FaChartLine, FaCloudUploadAlt, FaFileAlt, FaHistory, FaUserCircle, FaCog, FaSignOutAlt, FaComments, FaLayerGroup, FaFlask, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const roleItems = {
  default: [
    { label: 'Dashboard', to: '/dashboard', icon: FaChartLine },
    { label: 'Workspace', to: '/dashboard/workspaces', icon: FaLayerGroup },
    { label: 'Upload', to: '/dashboard/upload', icon: FaCloudUploadAlt },
    { label: 'My Papers', to: '/dashboard/papers', icon: FaFileAlt },
    { label: 'Chat', to: '/dashboard/chat', icon: FaComments },
    { label: 'History', to: '/dashboard/history', icon: FaHistory },
    { label: 'Profile', to: '/dashboard/profile', icon: FaUserCircle },
    { label: 'Settings', to: '/dashboard/settings', icon: FaCog },
  ],
  Researcher: [
    { label: 'Compare', to: '/dashboard/compare', icon: FaFlask },
    { label: 'Literature Review', to: '/dashboard/reviews', icon: FaLayerGroup },
  ],
  Doctor: [
    { label: 'Collections', to: '/dashboard/collections', icon: FaLayerGroup },
    { label: 'Share', to: '/dashboard/share', icon: FaComments },
  ],
  Admin: [
    { label: 'Admin', to: '/dashboard/admin', icon: FaShieldAlt },
    { label: 'Analytics', to: '/dashboard/analytics', icon: FaChartLine },
  ],
};

export default function DashboardSidebar({ onLogout }) {
  const { user } = useAuth();
  const items = [...roleItems.default, ...(roleItems[user?.role] || [])];

  return (
    <aside className="flex h-full w-full flex-col rounded-3xl bg-slate-950 px-4 py-5 text-white shadow-2xl shadow-blue-950/20 lg:w-72">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-blue-300">MedRAG</p>
        <h2 className="mt-2 text-xl font-semibold">Research Console</h2>
        <p className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
          {user?.role || 'User'}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="text-base" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        <FaSignOutAlt />
        Logout
      </button>
    </aside>
  );
}