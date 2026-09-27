import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import { useAuth } from '../context/AuthContext';
import { FaLayerGroup } from 'react-icons/fa';

export default function DashboardLayout() {
  const { logout, user, workspaces, selectedWorkspaceId, selectWorkspace } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="min-h-screen lg:flex">
      <div className="hidden p-4 lg:fixed lg:inset-y-0 lg:flex lg:w-80">
        <DashboardSidebar onLogout={handleLogout} />
      </div>

      <div className="flex-1 lg:pl-80">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="medical-shell mb-6 rounded-3xl px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">Welcome back</p>
                <h1 className="text-2xl font-semibold text-slate-950">{user?.name || 'Researcher'}</h1>
                <p className="mt-1 text-sm text-slate-500">{user?.role || 'User'} workspace access</p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  <FaLayerGroup className="text-blue-600" />
                  <select
                    value={selectedWorkspaceId}
                    onChange={(event) => selectWorkspace(event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setMobileOpen((value) => !value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 lg:hidden"
                >
                  Menu
                </button>
              </div>
            </div>
          </div>

          <Outlet />
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 lg:hidden">
          <div className="h-full w-full max-w-sm">
            <DashboardSidebar onLogout={handleLogout} />
          </div>
        </div>
      ) : null}
    </div>
  );
}