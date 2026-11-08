import { Injectable, signal } from '@angular/core';
import type { InboxConversation, ReplyDraft, WorkspaceTab } from '../models/support.models';

const emptyDraft = (): ReplyDraft => ({
  text: '',
  translate: false,
  suggestion: '',
  scrollTop: null,
});
const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id);
@Injectable({ providedIn: 'root' })
export class SupportWorkspaceService {
  readonly tabs = signal<WorkspaceTab[]>([]);
  readonly activeId = signal('');
  readonly draftIds = signal<string[]>([]);
  private drafts: Record<string, ReplyDraft> = {};
  private dismissed: Record<string, number> = {};
  private storageKey = '';
  activate(accountId: string) {
    const key = 'viago_support_workspace_' + accountId;
    try {
      if (key === this.storageKey && sessionStorage.getItem(key)) return;
    } catch {
      if (key === this.storageKey) return;
    }
    this.storageKey = key;
    this.tabs.set([]);
    this.activeId.set('');
    this.drafts = {};
    this.dismissed = {};
    try {
      const stored = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (stored?.version === 1) {
        const tabs = Array.isArray(stored.tabs)
          ? stored.tabs
              .filter(
                (tab: WorkspaceTab) =>
                  validId(tab?.id) &&
                  Number.isInteger(tab.readSequence) &&
                  Number.isInteger(tab.lastSequence),
              )
              .slice(0, 100)
          : [];
        this.tabs.set(tabs);
        if (
          validId(stored.activeId) &&
          tabs.some((tab: WorkspaceTab) => tab.id === stored.activeId)
        )
          this.activeId.set(stored.activeId);
        for (const [id, value] of Object.entries(stored.drafts || {})) {
          if (!validId(id) || !value || typeof value !== 'object') continue;
          const draft = value as ReplyDraft;
          if (typeof draft.text !== 'string' || draft.text.length > 4000) continue;
          this.drafts[id] = {
            ...emptyDraft(),
            text: draft.text,
            translate: draft.translate === true,
            suggestion:
              typeof draft.suggestion === 'string' ? draft.suggestion.slice(0, 12000) : '',
            scrollTop:
              Number.isFinite(draft.scrollTop) && draft.scrollTop! >= 0 ? draft.scrollTop : null,
            ...(draft.pending &&
            typeof draft.pending.text === 'string' &&
            typeof draft.pending.clientMessageId === 'string'
              ? { pending: draft.pending }
              : {}),
          };
        }
        for (const [id, sequence] of Object.entries(stored.dismissed || {}))
          if (validId(id) && typeof sequence === 'number' && Number.isInteger(sequence))
            this.dismissed[id] = sequence;
      }
    } catch {
      /* A bad browser snapshot must not prevent reading server conversations. */
    }
    this.updateDraftIds();
  }
  draft(id: string): ReplyDraft {
    return this.drafts[id] ? { ...this.drafts[id] } : emptyDraft();
  }
  save(id: string, value: Partial<ReplyDraft>) {
    if (!validId(id)) return;
    this.drafts[id] = { ...this.draft(id), ...value };
    this.updateDraftIds();
    this.persist();
  }
  private updateDraftIds() {
    this.draftIds.set(Object.keys(this.drafts).filter((id) => !!this.drafts[id].text.trim()));
  }
  open(id: string, row?: InboxConversation): boolean {
    if (!validId(id)) return false;
    if (!this.tabs().some((tab) => tab.id === id)) {
      if (this.tabs().length >= 100) return false;
      this.tabs.update((tabs) => [
        ...tabs,
        {
          id,
          status: row?.status || '',
          assignedAgentId: row?.assignedAgentId ?? null,
          lastSequence: row?.lastMessage?.sequence ?? 0,
          lastRole: row?.lastMessage?.role ?? '',
          readSequence: 0,
        },
      ]);
    }
    delete this.dismissed[id];
    this.activeId.set(id);
    this.persist();
    return true;
  }
  ingest(rows: InboxConversation[], staffId: string) {
    const next = [...this.tabs()];
    for (const row of rows) {
      const index = next.findIndex((tab) => tab.id === row.id);
      const sequence = row.lastMessage?.sequence ?? 0;
      if (index >= 0 && sequence < next[index].lastSequence) continue;
      const owned = row.status === 'ASSIGNED' && row.assignedAgentId === staffId;
      const dismissedAt = this.dismissed[row.id];
      if (
        index < 0 &&
        (!owned ||
          (dismissedAt !== undefined &&
            !(row.lastMessage?.role === 'CUSTOMER' && sequence > dismissedAt)) ||
          next.length >= 100)
      )
        continue;
      const tab: WorkspaceTab = {
        id: row.id,
        status: row.status,
        assignedAgentId: row.assignedAgentId,
        lastSequence: sequence,
        lastRole: row.lastMessage?.role || '',
        readSequence: index >= 0 ? next[index].readSequence : (dismissedAt ?? 0),
      };
      if (index >= 0) next[index] = tab;
      else {
        next.push(tab);
        delete this.dismissed[row.id];
      }
    }
    this.tabs.set(next);
    this.persist();
  }
  unread(tab: WorkspaceTab) {
    return tab.lastRole === 'CUSTOMER' && tab.lastSequence > tab.readSequence;
  }
  markRead(id: string, sequence: number) {
    if (!this.tabs().some((tab) => tab.id === id && tab.readSequence < sequence)) return;
    this.tabs.update((tabs) =>
      tabs.map((tab) =>
        tab.id === id ? { ...tab, readSequence: Math.max(tab.readSequence, sequence) } : tab,
      ),
    );
    this.persist();
  }
  close(id: string) {
    const tab = this.tabs().find((value) => value.id === id);
    if (tab) this.dismissed[id] = tab.lastSequence;
    this.tabs.update((tabs) => tabs.filter((value) => value.id !== id));
    if (this.activeId() === id) this.activeId.set('');
    this.persist();
  }
  private persist() {
    if (!this.storageKey) return;
    try {
      sessionStorage.setItem(
        this.storageKey,
        JSON.stringify({
          version: 1,
          activeId: this.activeId(),
          tabs: this.tabs(),
          drafts: this.drafts,
          dismissed: this.dismissed,
        }),
      );
    } catch {
      /* Keep drafts in memory if browser storage is full or disabled. */
    }
  }
}
