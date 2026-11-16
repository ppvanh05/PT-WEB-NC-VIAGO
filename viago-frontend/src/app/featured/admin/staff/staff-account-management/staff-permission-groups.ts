import { PERMISSION_MODULES } from './staff-seed';

// Presentation only. Fixed group membership is supplied by the backend.
export function staffRoleModules(keys: readonly string[]) {
  return PERMISSION_MODULES.filter(group => keys.includes(group.key));
}
