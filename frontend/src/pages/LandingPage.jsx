import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight, FaBrain, FaDatabase, FaFilePdf, FaShieldAlt } from 'react-icons/fa';
import SiteNavbar from '../components/SiteNavbar';

const features = [
  { icon: FaFilePdf, title: 'PDF upload pipeline', text: 'Upload medical papers and store document metadata securely.' },
  { icon: FaBrain, title: 'Retrieval-first AI', text: 'Answers are grounded in retrieved paper chunks, not general web data.' },
  { icon: FaDatabase, title: 'MongoDB history', text: 'Keep document records, chat history, and profile data in one place.' },
  { icon: FaShieldAlt, title: 'Secure by default', text: 'JWT auth, validation, rate limiting, and protected routes are built in.' },
];

const steps = [
  'Register and sign in.',
  'Upload a PDF medical paper.',
  'Ask a question and receive a cited answer.',
  'Review your paper library and conversation history.',
];

export default function LandingPage() {
  return (
    <div>
      <SiteNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 px-6 py-16 shadow-[0_20px_80px_rgba(37,99,235,0.08)] backdrop-blur-xl sm:px-10 lg:px-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_25%)]" />
          <div className="relative grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                AI Medical Research Assistant
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Research-grade answers from your uploaded medical papers.
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Upload papers, search semantically, and ask questions with cited answers that stay grounded in the document set you control.
              </motion.p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
                  Get Started <FaArrowRight />
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">
                  Sign In
                </Link>
              </div>

              <p className="mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                This project is for educational purposes only and should not be used for medical diagnosis.
              </p>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-xl shadow-blue-100/50">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                        <Icon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-950">{feature.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{feature.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="medical-shell rounded-3xl p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <Icon />
                </div>
                <h3 className="text-lg font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              </div>
            );
          })}
        </section>

        <section id="how-it-works" className="mt-16 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="medical-shell rounded-[2rem] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">How It Works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Built around a strict, document-first workflow.</h2>
            <div className="mt-8 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{index + 1}</div>
                  <p className="text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="medical-shell rounded-[2rem] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Tech Stack</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Modern full-stack architecture.</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {['React', 'Vite', 'TailwindCSS', 'Express', 'MongoDB', 'FastAPI', 'LangChain', 'FAISS'].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="medical-shell rounded-[2rem] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">What makes this safe for research?</h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p>Answers are generated only from uploaded documents and return source citations.</p>
              <p>The backend uses JWT-protected routes and validation for every sensitive action.</p>
              <p>The AI service falls back to a refusal message when the answer is not found in the papers.</p>
            </div>
          </div>

          <div className="medical-shell rounded-[2rem] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Disclaimer</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Important usage note</h2>
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              This project is for educational purposes only and should not be used for medical diagnosis.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}