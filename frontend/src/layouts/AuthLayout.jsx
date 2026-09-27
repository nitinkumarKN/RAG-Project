import BrandMark from '../components/BrandMark';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="medical-shell w-full max-w-5xl overflow-hidden rounded-[2rem]">
        <div className="grid lg:grid-cols-2">
          <div className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
            <BrandMark />
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-blue-300">Medical AI Workspace</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight">Search papers, ask questions, and keep every answer cited.</h1>
              <p className="mt-4 max-w-md text-slate-300">
                Built for research workflows with uploads, history, and source-grounded answers.
              </p>
            </div>
          </div>
          <div className="bg-white/80 p-6 sm:p-10">{children}</div>
        </div>
      </div>
    </div>
  );
}