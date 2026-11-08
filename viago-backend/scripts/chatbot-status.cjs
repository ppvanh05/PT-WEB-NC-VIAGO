require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const tables =
      await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename LIKE '%chatbot' OR tablename IN ('SupportConversation','SupportMessage','SupportEvent'))`;
    const required = [
      'hoi_thoai_chatbot',
      'tin_nhan_chatbot',
      'su_kien_chatbot',
      'bo_nho_chatbot',
      'yeu_cau_chuyen_tiep_chatbot',
      'phan_cong_chatbot',
      'danh_muc_kien_thuc_chatbot',
      'tai_lieu_kien_thuc_chatbot',
      'doan_kien_thuc_chatbot',
    ];
    const names = new Set(tables.map((table) => table.tablename));
    const missing = required.filter((table) => !names.has(table));
    const legacy = [...names].filter((table) => table.startsWith('Support'));
    console.log('Support database:', {
      ready: !missing.length && !legacy.length,
      tables: required.length - missing.length,
      missing,
      legacy,
    });
    if (missing.length || legacy.length)
      throw new Error('Run chatbot:db:setup');
    const [publishedFaq, activePolicies, documents, chunks, embedded] =
      await Promise.all([
        prisma.faq.count({ where: { trangthai: 'HoatDong' } }),
        prisma.chinh_sach.count({
          where: { trangthai: 'DangApDung', ngayapdung: { lte: new Date() } },
        }),
        prisma.tai_lieu_kien_thuc_chatbot.count({
          where: { trangthai: 'HoatDong' },
        }),
        prisma.doan_kien_thuc_chatbot.count({
          where: { tai_lieu_kien_thuc_chatbot: { trangthai: 'HoatDong' } },
        }),
        prisma.$queryRaw`SELECT count(*)::int AS total FROM doan_kien_thuc_chatbot c JOIN tai_lieu_kien_thuc_chatbot d USING(matailieu) WHERE d.trangthai='HoatDong' AND c.embedding IS NOT NULL`,
      ]);
    console.log('Knowledge base:', {
      publishedFaq,
      activePolicies,
      documents,
      chunks,
      embedded: embedded[0].total,
    });
  } catch (error) {
    console.error('Support database unavailable:', error.code || error.name);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
  try {
    const provider = process.env.CHATBOT_PROVIDER || 'openai';
    if (provider === 'openai' || provider === 'groq') {
      const openai = provider === 'openai';
      const model = openai
        ? process.env.OPENAI_MODEL || 'gpt-6-luna'
        : process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      const keyName = openai ? 'OPENAI_API_KEY' : 'GROQ_API_KEY';
      const apiKey = process.env[keyName]?.trim();
      if (!apiKey) {
        console.log('AI:', {
          provider,
          model,
          configured: false,
          available: false,
          action: `Set ${keyName} in backend environment.`,
        });
        return;
      }
      const url = openai
        ? 'https://api.openai.com/v1/models/' + encodeURIComponent(model)
        : 'https://api.groq.com/openai/v1/models';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      console.log('AI:', {
        provider,
        model,
        configured: true,
        available:
          response.ok &&
          (openai
            ? data.id === model
            : !!data.data?.some((item) => item.id === model)),
      });
      return;
    }
    const model = process.env.OLLAMA_MODEL || 'qwen3:8b';
    const base = (
      process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
    ).replace(/\/$/, '');
    const response = await fetch(base + '/api/tags', {
      signal: AbortSignal.timeout(3000),
    });
    const data = await response.json();
    console.log('AI:', {
      provider,
      available:
        response.ok && !!data.models?.some((item) => item.name === model),
      model,
    });
  } catch {
    console.log('AI provider unavailable. Check backend provider settings.');
  }
}
main().catch(() => {
  console.error('Readiness check failed.');
  process.exitCode = 1;
});
