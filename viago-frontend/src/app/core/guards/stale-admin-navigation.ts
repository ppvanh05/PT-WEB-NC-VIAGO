export function staleAdminNavigation(error: unknown, url: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return url.startsWith('/admin/') && !url.startsWith('//') &&
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
}

export function recoverAdminNavigation(error: unknown, url: string): void {
  if (!staleAdminNavigation(error, url)) return;
  try {
    const key = 'viago_admin_module_reload';
    const previous = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - previous < 60000) return;
    sessionStorage.setItem(key, String(Date.now()));
    window.location.replace(url);
  } catch {
    // Keep the navigation error visible if browser storage is unavailable.
  }
}
