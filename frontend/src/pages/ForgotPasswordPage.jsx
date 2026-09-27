import { useState } from 'react';
import toast from 'react-hot-toast';
import { forgotPassword } from '../services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await forgotPassword({ email });
      setResetToken(data.resetToken || '');
      toast.success(data.message || 'Reset token generated');
    } catch {
      toast.error('Unable to generate reset token');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="medical-shell mx-auto mt-16 max-w-xl rounded-[2rem] p-8">
      <h1 className="text-3xl font-semibold text-slate-950">Forgot Password</h1>
      <p className="mt-3 text-slate-600">Request a password reset token for development and testing.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email address" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" required />
        <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white" disabled={loading}>{loading ? 'Sending...' : 'Generate Reset Token'}</button>
      </form>
      {resetToken ? (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-blue-700">Development reset token</p>
          <p className="mt-2 break-all">{resetToken}</p>
        </div>
      ) : null}
    </div>
  );
}