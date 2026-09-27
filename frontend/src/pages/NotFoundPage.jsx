import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="medical-shell max-w-lg rounded-[2rem] p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-3 text-slate-600">The page you requested does not exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
          Go Home
        </Link>
      </div>
    </div>
  );
}