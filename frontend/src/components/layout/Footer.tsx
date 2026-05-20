export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-white font-extrabold">S</span>
            <span className="font-bold text-slate-900">ShopForge</span>
          </div>
          <p className="mt-2 max-w-md">
            A reference e-commerce stack — React, FastAPI, and PostgreSQL. Built for clarity.
          </p>
        </div>
        <div className="flex gap-6">
          <a className="hover:text-slate-900" href="#">About</a>
          <a className="hover:text-slate-900" href="#">Contact</a>
          <a className="hover:text-slate-900" href="#">Privacy</a>
          <a className="hover:text-slate-900" href="#">Terms</a>
        </div>
        <div className="text-slate-500">© {new Date().getFullYear()} ShopForge</div>
      </div>
    </footer>
  );
}
