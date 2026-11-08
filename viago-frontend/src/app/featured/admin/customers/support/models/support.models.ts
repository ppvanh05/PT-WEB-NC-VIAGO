export type InboxLane = 'ALL' | 'QUEUED' | 'MINE' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
export interface SupportAgent {
  id: string;
  name: string;
}
export interface SupportMessage {
  id: string;
  sequence: number;
  role: string;
  text: string;
  createdAt: string;
  clientMessageId?: string | null;
  originalText?: string | null;
  agentId?: string | null;
  agent?: SupportAgent | null;
}
export interface HandoffRequest {
  id: string;
  reason: string;
  category: string;
  priority: string;
  trigger: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  assignments?: {
    id: string;
    status: string;
    assignedAt: string;
    endedAt: string | null;
    agent: SupportAgent;
  }[];
}
export interface InboxConversation {
  id: string;
  status: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  assignedAgentId: string | null;
  assignedAgent: SupportAgent | null;
  priority: number;
  request: HandoffRequest | null;
  lastMessage: SupportMessage | null;
  messageCount: number;
}
export interface WorkspaceTab {
  id: string;
  status: string;
  assignedAgentId: string | null;
  lastSequence: number;
  lastRole: string;
  readSequence: number;
}
export interface ReplyDraft {
  text: string;
  translate: boolean;
  suggestion: string;
  scrollTop: number | null;
  pending?: { text: string; clientMessageId: string; translate: string };
}
export interface ConversationDetail extends InboxConversation {
  priorityAssessment?: {
    policyVersion: string;
    level: string;
    score: number;
    basis: string[];
  } | null;
  messages: SupportMessage[];
  hasOlder: boolean;
  summary: string | null;
  requests: HandoffRequest[];
}
export interface InboxResponse {
  statistics: Partial<Record<InboxLane, number>>;
  data: InboxConversation[];
  counts: Record<InboxLane, number>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export const categories: Record<string, string> = {
  ThanhToan: 'Thanh toán',
  DatVe: 'Đặt vé',
  HoanTien: 'Hoàn tiền',
  KhieuNai: 'Khiếu nại',
  AnToan: 'An toàn',
  Khac: 'Hỗ trợ khác',
};
export const priorities: Record<string, string> = {
  Thap: 'Thấp',
  TrungBinh: 'Trung bình',
  Cao: 'Cao',
  KhanCap: 'Khẩn cấp',
};
export const statuses: Record<string, string> = {
  QUEUED: 'Chờ tiếp nhận',
  ASSIGNED: 'Đang hỗ trợ',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
  BOT: 'Trợ lý AI',
  AWAITING_CONFIRMATION: 'Chờ khách xác nhận',
};
