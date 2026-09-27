import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPassword } from '../services/authService';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await resetPassword(token, { password });
      toast.success('Password updated');
      navigate('/login');
    } catch {
      toast.error('Unable to reset password');
    }
  }

  return (
    <div className="medical-shell mx-auto mt-16 max-w-xl rounded-[2rem] p-8">
      <h1 className="text-3xl font-semibold text-slate-950">Reset Password</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="New password" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" required />
        <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">Update Password</button>
      </form>
    </div>
  );
}