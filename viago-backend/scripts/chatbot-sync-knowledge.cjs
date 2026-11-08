require('dotenv').config({ quiet: true });
const { PrismaService } = require('../dist/prisma/prisma.service');
const {
  ChatbotRagService,
} = require('../dist/featured/customer/chatbot/knowledge/rag.service');
const prisma = new PrismaService();
async function main() {
  const result = await new ChatbotRagService(prisma).syncProject();
  console.log('Project knowledge indexed:', result.data.length);
  console.log(
    'Active documents:',
    await prisma.tai_lieu_kien_thuc_chatbot.count({
      where: { trangthai: 'HoatDong' },
    }),
  );
}
main()
  .catch((error) => {
    console.error('Knowledge sync failed:', error.code || error.name);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
