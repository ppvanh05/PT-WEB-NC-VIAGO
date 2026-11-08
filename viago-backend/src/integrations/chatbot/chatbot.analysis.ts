import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  validateSync,
} from 'class-validator';
import type { ChatbotMemory, KnowledgeSource } from './chatbot.tools';
import { supportPriority } from './chatbot.priority';

export type TranscriptLine = { id?: string; role: string; text: string };
export class ModelAssessment {
  @IsIn([
    'booking',
    'payment',
    'refund',
    'complaint',
    'lost_property',
    'safety',
    'general',
  ])
  intent: string;
  @IsIn(['vi', 'en', 'other']) language: string;
  @IsInt() @Min(0) @Max(100) frustration: number;
  @IsInt() @Min(0) @Max(100) risk2Turns: number;
  @IsInt() @Min(0) @Max(100) risk3Turns: number;
  @IsBoolean() needsHuman: boolean;
  @IsString() @MaxLength(1200) reason: string;
  @IsString() @MaxLength(2000) summaryVi: string;
  @IsString() @MaxLength(2000) summaryEn: string;
}
export const assessmentSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    intent: {
      type: 'string',
      enum: [
        'booking',
        'payment',
        'refund',
        'complaint',
        'lost_property',
        'safety',
        'general',
      ],
    },
    language: { type: 'string', enum: ['vi', 'en', 'other'] },
    frustration: { type: 'integer', minimum: 0, maximum: 100 },
    risk2Turns: { type: 'integer', minimum: 0, maximum: 100 },
    risk3Turns: { type: 'integer', minimum: 0, maximum: 100 },
    needsHuman: { type: 'boolean' },
    reason: { type: 'string' },
    summaryVi: { type: 'string' },
    summaryEn: { type: 'string' },
  },
  required: [
    'intent',
    'language',
    'frustration',
    'risk2Turns',
    'risk3Turns',
    'needsHuman',
    'reason',
    'summaryVi',
    'summaryEn',
  ],
};
export function parseAssessment(value: unknown): ModelAssessment {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid assessment');
  const result = plainToInstance(ModelAssessment, value);
  if (
    validateSync(result, { whitelist: true, forbidNonWhitelisted: true }).length
  )
    throw new Error('Invalid assessment');
  return result;
}
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
export function redact(text: string) {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, '[private-number]');
}
export function assessConversation(
  history: TranscriptLine[],
  model?: ModelAssessment,
  previousFrustration = 0,
) {
  const customers = history.filter((m) => m.role === 'CUSTOMER');
  const latest = customers.at(-1)?.text ?? '';
  const text = normalize(latest);
  const angry =
    /\b(buc minh|tuc gian|qua te|lua dao|vo trach nhiem|khong chap nhan|chan qua|angry|furious|scam|unacceptable|terrible)\b/.test(
      text,
    );
  const fraudAccusation =
    /\b(lua dao|scam|fraud)\b/.test(text) &&
    !/\b(chong lua dao|phong (chong|tranh) lua dao|khong (phai|he).{0,15}lua dao|anti.fraud|scam prevention)\b/.test(
      text,
    );
  const failed =
    /\b(chua (duoc|giai quyet|nhan)|van (loi|chua|khong)|noi (mai|roi)|lan (thu|nay)|bao nhieu lan|again|still|not resolved|already told)\b/.test(
      text,
    );
  const repeatCount = customers
    .slice(-4)
    .filter((m) =>
      /chua|van |again|still|noi roi|already told/.test(normalize(m.text)),
    ).length;
  const negatedHuman =
    /\b(khong|chua|dung|khong can|khong muon|do not|don't|no need to)\b.{0,35}\b(nhan vien|cskh|nguoi that|human|agent)\b/.test(
      text,
    );
  const human =
    !negatedHuman &&
    /\b((gap|noi chuyen|ket noi|chuyen|goi|can|muon).{0,35}(nhan vien|cskh|nguoi that|quan ly)|human agent|speak to.{0,15}(agent|human)|talk to.{0,15}(agent|human)|supervisor|manager)\b/.test(
      text,
    );
  const safety =
    /\b(tai nan|nguy hiem|de doa|hanh hung|quay roi|say ruou|accident|danger|assault|harass|drunk driver)\b/.test(
      text,
    );
  const policyQuestion =
    /\b(chinh sach|dieu kien|quy dinh|policy|policies)\b/.test(text) &&
    !/\b(toi muon|giup toi|huy giup|i want|cancel my|my refund)\b/.test(text);
  const refund =
    !policyQuestion &&
    /\b(hoan tien|hoan ve|huy ve|huy chuyen|refund|cancel my|hay tra (lai )?tien|tra (lai )?tien cho (toi|minh)|doi (lai )?tien|give me (back )?my money)\b/.test(
      text,
    );
  const payment =
    /\b(tru tien|mat tien|charged|paid.*no ticket|thanh toan.{0,45}(chua|khong).{0,20}(ve|xac nhan)|giao dich.{0,20}(bat thuong|khong phai)|thanh toan.{0,20}(hai lan|2 lan))\b/.test(
      text,
    ) &&
    !/\b(chua bi tru tien|khong bi tru tien|cach thanh toan|huong dan thanh toan)\b/.test(
      text,
    );
  const threat =
    /\b(khieu nai|kien|bao chi|boc phot|cong an|lawsuit|report|police)\b/.test(
      text,
    );
  const frustration = Math.max(
    model?.frustration ?? 0,
    Math.min(
      100,
      (angry ? 55 : 5) +
        (failed ? 20 : 0) +
        (repeatCount >= 2 ? 15 : 0) +
        (threat ? 20 : 0),
    ),
  );
  const trend = frustration - previousFrustration;
  const risk2Turns = Math.max(
    model?.risk2Turns ?? 0,
    Math.min(
      100,
      frustration +
        (failed ? 15 : 0) +
        (trend >= 20 && customers.length > 1 ? 10 : 0),
    ),
  );
  const risk3Turns = Math.max(
    risk2Turns,
    model?.risk3Turns ?? 0,
    Math.min(100, risk2Turns + (repeatCount >= 2 ? 15 : 5)),
  );
  const reasons = [
    human && 'customer_requested_human',
    fraudAccusation && 'fraud_accusation',
    safety && 'safety_incident',
    refund && 'refund_requires_verification',
    payment && 'payment_requires_verification',
    threat && 'formal_complaint',
    failed && repeatCount >= 2 && 'repeated_unresolved_issue',
    risk3Turns >= 65 && 'predicted_escalation',
    model?.needsHuman &&
      !(
        /^(tra cuu chuyen di|mua ve khu hoi)[.!?]*$/.test(text.trim()) &&
        frustration < 35 &&
        risk3Turns < 65
      ) &&
      'model_detected_complexity',
  ].filter((x): x is string => !!x);
  const immediate =
    human ||
    safety ||
    payment ||
    (threat &&
      (angry || /nghiem trong|bao chi|cong an|kien|lawsuit|police/.test(text)));
  const needsHuman = reasons.length > 0;
  const intent = safety
    ? 'safety'
    : refund
      ? 'refund'
      : payment
        ? 'payment'
        : (model?.intent ?? (angry ? 'complaint' : 'general'));
  return {
    version: 'support-risk-v1',
    source: model ? 'model_and_rules' : 'rules_fallback',
    intent,
    priority: supportPriority({
      intent,
      reasons,
      frustration: { score: frustration },
    }),
    language:
      model?.language ??
      (/\b(hello|please|refund|payment|ticket|help|cancel|agent)\b/i.test(
        latest,
      )
        ? 'en'
        : 'vi'),
    frustration: {
      score: frustration,
      level:
        frustration >= 70 ? 'high' : frustration >= 35 ? 'moderate' : 'low',
      trend,
    },
    forecast: {
      horizonTurns: [2, 3],
      risk2Turns,
      risk3Turns,
      calibrated: false,
      interpretation:
        'Ordinal risk scores, not measured probabilities; validate against labeled support conversations.',
    },
    needsHuman,
    handoffMode: immediate
      ? ('IMMEDIATE' as const)
      : needsHuman
        ? ('ASK_CONFIRMATION' as const)
        : ('AI_HANDLE' as const),
    reasons,
    evidence: [
      {
        messageId: customers.at(-1)?.id ?? null,
        excerpt: redact(latest).slice(0, 500),
      },
    ],
    modelReason:
      model?.reason ??
      'Conservative rules applied; semantic model unavailable.',
    summaryVi:
      model?.summaryVi ??
      `Khách vừa gửi (nguyên văn, chưa chuyển ngữ): ${redact(latest).slice(0, 1200)}. Cần nhân viên kiểm tra trước khi cam kết xử lý.`,
    summaryEn:
      model?.summaryEn ??
      `Latest customer message (original, translation unavailable): ${redact(latest).slice(0, 1200)}. Staff verification required before making commitments.`,
  };
}
export type SupportAssessment = ReturnType<typeof assessConversation> & {
  sources?: KnowledgeSource[];
  memory?: ChatbotMemory;
  toolTrace?: {
    name: string;
    args: unknown;
    source?: unknown;
    total?: unknown;
  }[];
};
