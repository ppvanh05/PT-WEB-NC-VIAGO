require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const {
  assessConversation,
} = require('../dist/integrations/chatbot/chatbot.analysis');
const db = new PrismaClient(),
  apply = process.argv.includes('--apply');
const categories = {
  payment: 'ThanhToan',
  booking: 'DatVe',
  refund: 'HoanTien',
  complaint: 'KhieuNai',
  safety: 'AnToan',
};
async function main() {
  let cursor,
    checked = 0,
    changed = 0;
  for (;;) {
    const rows = await db.hoi_thoai_chatbot.findMany({
      where: {
        status: { in: ['ChoNhanVien', 'NhanVienHoTro'] },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: 100,
      select: { id: true },
    });
    if (!rows.length) break;
    for (const { id } of rows) {
      checked++;
      await db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT mahoithoai FROM hoi_thoai_chatbot WHERE mahoithoai = ${id} FOR UPDATE`;
          const row = await tx.hoi_thoai_chatbot.findUnique({ where: { id } });
          if (
            !row ||
            !['ChoNhanVien', 'NhanVienHoTro'].includes(row.status) ||
            row.processingToken
          )
            return;
          const history = await tx.tin_nhan_chatbot.findMany({
            where: { conversationId: id },
            orderBy: { sequence: 'desc' },
            take: 24,
          });
          const analysis = assessConversation(
            history
              .reverse()
              .map((m) => ({
                id: m.id,
                role:
                  m.role === 'KhachHang'
                    ? 'CUSTOMER'
                    : m.role === 'TroLyAI'
                      ? 'BOT'
                      : m.role === 'NhanVien'
                        ? 'AGENT'
                        : 'SYSTEM',
                text: m.text,
              })),
          );
          const previous =
            row.analysis &&
            typeof row.analysis === 'object' &&
            !Array.isArray(row.analysis)
              ? row.analysis
              : {};
          if (
            row.priority === analysis.priority.score &&
            JSON.stringify(previous.priority) ===
              JSON.stringify(analysis.priority)
          )
            return;
          changed++;
          if (!apply) return;
          await tx.hoi_thoai_chatbot.update({
            where: { id },
            data: {
              priority: analysis.priority.score,
              analysis: { ...previous, priority: analysis.priority },
              revision: { increment: 1 },
            },
          });
          await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
            where: {
              mahoithoai: id,
              trangthai: { in: ['ChoNhanVien', 'DangXuLy'] },
            },
            data: {
              mucdouutien: analysis.priority.level,
              ...(categories[analysis.intent]
                ? { loaivande: categories[analysis.intent] }
                : {}),
            },
          });
          await tx.su_kien_chatbot.create({
            data: {
              conversationId: id,
              type: 'priority',
              data: { ...analysis.priority, previousScore: row.priority },
            },
          });
        },
        { timeout: 15000 },
      );
    }
    cursor = rows.at(-1).id;
  }
  console.log(
    JSON.stringify({
      mode: apply ? 'applied' : 'preview',
      checked,
      changed,
      policy: 'uu-tien-cskh-v1',
    }),
  );
}
main()
  .catch((e) => {
    console.error(e.code || e.name);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
