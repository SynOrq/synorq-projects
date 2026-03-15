function AppShellLine({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-slate-200 ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="min-h-full bg-[#eef3f8] p-8">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <AppShellLine className="h-3 w-32" />
        <AppShellLine className="mt-4 h-9 w-72" />
        <AppShellLine className="mt-3 h-4 w-full max-w-2xl" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <AppShellLine className="h-3 w-20" />
            <AppShellLine className="mt-4 h-8 w-16" />
            <AppShellLine className="mt-3 h-4 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <AppShellLine className="h-3 w-28" />
            <AppShellLine className="mt-4 h-7 w-56" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <div key={row} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <AppShellLine className="h-4 w-40" />
                  <AppShellLine className="mt-3 h-3 w-full" />
                  <AppShellLine className="mt-2 h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
