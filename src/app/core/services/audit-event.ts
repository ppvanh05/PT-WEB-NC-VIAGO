export interface AuditActor { code: string; name: string; username: string; role: string; phone: string; }
export interface AuditMetadata {
  actor: AuditActor; action: string; target: { code: string; name: string; type: string };
  timestamp: string; status: 'Thành công' | 'Thất bại'; userAgent: string;
  changes?: { field: string; before: string; after: string }[];
}

export function adminAudit(action: string, target: AuditMetadata['target'], changes?: AuditMetadata['changes']): AuditMetadata {
  let actor: AuditActor = { code: '', name: 'Quản trị viên', username: '', role: 'Quản trị viên', phone: '' };
  try {
    const user = JSON.parse(localStorage.getItem('viago_current_user') || 'null');
    if (user?.role === 'admin') actor = { code: user.id || '', name: user.name || 'Quản trị viên', username: user.username || user.phoneNumber || '', role: 'Quản trị viên', phone: user.phoneNumber || '' };
  } catch { /* An unavailable session must not attribute the operation to its target. */ }
  return { actor, action, target, timestamp: new Date().toISOString(), status: 'Thành công', userAgent: navigator.userAgent, ...(changes ? { changes } : {}) };
}
