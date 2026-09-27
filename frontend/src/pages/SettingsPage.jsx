import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  function handleLogout() {
    logout();
    toast.success('Logged out');
  }

  async function handleDeleteAccount() {
    if (!window.confirm('This will permanently delete your account, papers, and chat history. Continue?')) return;

    try {
      await deleteAccount();
      logout();
      toast.success('Account deleted');
      navigate('/');
    } catch {
      toast.error('Unable to delete account');
    }
  }

  return (
    <section className="medical-shell rounded-[2rem] p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-slate-950">Settings</h2>
      <div className="mt-6 space-y-4">
        <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4">
          <div>
            <p className="font-medium text-slate-950">Dark Mode</p>
            <p className="text-sm text-slate-500">UI preference placeholder for future theme persistence.</p>
          </div>
          <input type="checkbox" checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} />
        </label>

        <button onClick={handleLogout} className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white">Logout</button>
        <button onClick={handleDeleteAccount} className="rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white">Delete Account</button>
      </div>
    </section>
  );
}