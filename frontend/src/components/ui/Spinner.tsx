export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="grid place-items-center py-24">
      <Spinner size={36} />
    </div>
  );
}
