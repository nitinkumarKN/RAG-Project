import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', profilePicture: user?.profilePicture || '' });

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await updateProfile(form);
      toast.success('Profile updated');
      setForm((current) => ({ ...current, password: '' }));
    } catch {
      toast.error('Unable to update profile');
    }
  }

  return (
    <section className="medical-shell rounded-[2rem] p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-slate-950">Profile</h2>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        {['name', 'email', 'profilePicture'].map((field) => (
          <label key={field} className={field === 'profilePicture' ? 'md:col-span-2' : ''}>
            <span className="mb-2 block text-sm font-medium text-slate-700 capitalize">{field}</span>
            <input value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" />
          </label>
        ))}
        <label className="md:col-span-2">
          <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
          <input value={form.password} type="password" onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" placeholder="Leave blank to keep current password" />
        </label>
        <button className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white md:col-span-2">Save Changes</button>
      </form>
    </section>
  );
}