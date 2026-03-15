function PulseLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200 ${className}`} />;
}

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur">
          <PulseLine className="h-3 w-28" />
          <PulseLine className="mt-5 h-10 w-72" />
          <PulseLine className="mt-4 h-4 w-full max-w-2xl" />
          <PulseLine className="mt-2 h-4 w-full max-w-xl" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <PulseLine className="h-10 w-10 rounded-2xl" />
                <PulseLine className="mt-6 h-8 w-20" />
                <PulseLine className="mt-3 h-4 w-32" />
                <PulseLine className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
