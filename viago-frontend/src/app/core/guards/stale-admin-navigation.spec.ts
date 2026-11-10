import { staleAdminNavigation } from './stale-admin-navigation';

describe('Stale admin modules', () => {
  it('recognizes an outdated lazy module on an admin route', () => {
    expect(staleAdminNavigation(new Error('Failed to fetch dynamically imported module: chunk-old.js'), '/admin/logs')).toBe(true);
  });
  it('does not retry access errors or navigate to external destinations', () => {
    expect(staleAdminNavigation(new Error('Forbidden'), '/admin/logs')).toBe(false);
    expect(staleAdminNavigation(new Error('Failed to fetch dynamically imported module'), '//example.com/admin/logs')).toBe(false);
    expect(staleAdminNavigation(new Error('Failed to fetch dynamically imported module'), '/customer')).toBe(false);
  });
});
