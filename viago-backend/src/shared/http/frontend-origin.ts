export function allowedFrontendOrigin(origin?: string): boolean {
  if (!origin) return true;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin)
    return false;
  const configured = (process.env.FRONTEND_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((value) => value.trim());
  return (
    configured.includes(origin) ||
    (process.env.NODE_ENV !== 'production' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  );
}

export function sameProxyOrigin(origin: string, host?: string): boolean {
  try {
    const url = new URL(origin);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      url.origin === origin &&
      url.host.toLowerCase() === host?.toLowerCase()
    );
  } catch {
    return false;
  }
}
