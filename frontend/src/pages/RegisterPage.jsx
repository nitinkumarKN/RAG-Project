import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await register(form);
      toast.success('Account created successfully');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to register');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Create account</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Start your research workspace</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <FaUser className="text-slate-400" />
              <input className="w-full border-none bg-transparent outline-none" type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" required />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <FaEnvelope className="text-slate-400" />
              <input className="w-full border-none bg-transparent outline-none" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <FaLock className="text-slate-400" />
              <input className="w-full border-none bg-transparent outline-none" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Minimum 8 characters" required />
            </div>
          </label>

          <button disabled={submitting} className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-semibold text-blue-700">Sign in</Link>
        </div>

        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This project is for educational purposes only and should not be used for medical diagnosis.
        </p>
      </div>
    </AuthLayout>
  );
}