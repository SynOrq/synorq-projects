export type ReleaseHealthCheck = {
  key: "database" | "env";
  label: string;
  ok: boolean;
  detail: string;
};

export function buildReleaseHealthPayload(params: {
  app: string;
  version: string;
  databaseOk: boolean;
  envOk: boolean;
  timestamp?: Date;
}) {
  const timestamp = params.timestamp ?? new Date();
  const checks: ReleaseHealthCheck[] = [
    {
      key: "database",
      label: "Database",
      ok: params.databaseOk,
      detail: params.databaseOk ? "Primary database baglantisi hazir." : "Primary database baglantisi basarisiz.",
    },
    {
      key: "env",
      label: "Runtime config",
      ok: params.envOk,
      detail: params.envOk ? "Kritik environment degiskenleri mevcut." : "Eksik kritik environment degiskeni bulundu.",
    },
  ];

  const status = checks.every((check) => check.ok) ? "ok" : "degraded";

  return {
    app: params.app,
    version: params.version,
    status,
    timestamp: timestamp.toISOString(),
    checks,
  };
}
