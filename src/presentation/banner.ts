// Рядок старту сервера. Чиста функція — щоб її можна було звірити з еталоном baselines/startup-banner.txt.
export interface BannerInput {
  version: string;
  port: number;
  env: string | undefined;
}

export function startupBanner({ version, port, env }: BannerInput): string {
  return `trip-ledger v${version} · http://localhost:${port} · NODE_ENV=${env ?? 'development'}`;
}
