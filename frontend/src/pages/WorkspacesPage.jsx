import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaPlus, FaUsers } from 'react-icons/fa';
import { addWorkspaceMember, createWorkspace, listWorkspaces } from '../services/workspaceService';
import { useAuth } from '../context/AuthContext';

function WorkspaceSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((index) => (
        <div key={index} className="animate-pulse rounded-3xl border border-slate-100 bg-white p-5">
          <div className="h-4 w-20 rounded bg-slate-200" />
          <div className="mt-4 h-6 w-40 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-28 rounded bg-slate-200" />
          <div className="mt-6 h-9 w-full rounded-2xl bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export default function WorkspacesPage() {
  const { reloadWorkspaces, selectWorkspace, user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [inviteForms, setInviteForms] = useState({});

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const data = await listWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch {
      setWorkspaces([]);
      toast.error('Unable to load workspaces');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const data = await createWorkspace(form);
      toast.success('Workspace created');
      setForm({ name: '', description: '' });
      await loadWorkspaces();
      selectWorkspace(data.workspace.id);
      reloadWorkspaces();
    } catch {
      toast.error('Unable to create workspace');
    } finally {
      setSubmitting(false);
    }
  }

  function updateInviteField(workspaceId, field, value) {
    setInviteForms((current) => ({
      ...current,
      [workspaceId]: {
        email: current[workspaceId]?.email || '',
        role: current[workspaceId]?.role || 'User',
        [field]: value,
      },
    }));
  }

  async function handleInvite(workspaceId) {
    const invite = inviteForms[workspaceId] || {};
    if (!invite.email?.trim()) {
      toast.error('Enter a collaborator email');
      return;
    }

    try {
      await addWorkspaceMember(workspaceId, { email: invite.email.trim(), role: invite.role || 'User' });
      toast.success('Collaborator invited');
      setInviteForms((current) => ({ ...current, [workspaceId]: { email: '', role: 'User' } }));
      await loadWorkspaces();
      reloadWorkspaces();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to invite collaborator');
    }
  }

  return (
    <section className="space-y-6">
      <div className="medical-shell rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Workspaces</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Organize research by team or topic</h2>
            <p className="mt-2 text-sm text-slate-500">Create spaces like Cancer Research or COVID Research and invite collaborators later.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Workspace name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" required />
          <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" />
          <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
            <FaPlus /> {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      {loading ? <WorkspaceSkeleton /> : null}

      {!loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <article key={workspace.id} className="medical-shell rounded-3xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-blue-600">Workspace</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{workspace.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{workspace.description || 'No description added yet.'}</p>
                </div>
                <FaUsers className="text-2xl text-blue-600" />
              </div>

              <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
                <span>{workspace.members?.length || 0} members</span>
                <span>{workspace.settings?.isArchived ? 'Archived' : 'Active'}</span>
              </div>

              {user?.role === 'Admin' || workspace.owner === user?.id ? (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-950">Invite collaborator</p>
                  <div className="mt-3 space-y-3">
                    <input
                      value={inviteForms[workspace.id]?.email || ''}
                      onChange={(event) => updateInviteField(workspace.id, 'email', event.target.value)}
                      placeholder="Collaborator email"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    />
                    <div className="flex gap-3">
                      <select
                        value={inviteForms[workspace.id]?.role || 'User'}
                        onChange={(event) => updateInviteField(workspace.id, 'role', event.target.value)}
                        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                      >
                        <option value="User">User</option>
                        <option value="Researcher">Researcher</option>
                        <option value="Doctor">Doctor</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleInvite(workspace.id)}
                        className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}

          {!workspaces.length ? (
            <div className="medical-shell rounded-3xl p-8 md:col-span-2 xl:col-span-3">
              <p className="text-lg font-semibold text-slate-950">No workspaces yet</p>
              <p className="mt-2 text-sm text-slate-500">Create your first workspace to start organizing papers and chats.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}