import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

async function main() {
  const crmPrisma = new CrmPrismaClient({
    datasources: { db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:root@localhost:3306/mos_lab' } },
  });

  console.log('Seeding default Workshop Lash Design Template...');

  const templateName = '01 BỘ SƯU TẬP THIẾT KẾ MI THỊNH HÀNH (CƠ BẢN & NÂNG CAO)';
  let template = await crmPrisma.crmAcademyWorkshopDesignTemplate.findFirst({
    where: { title: templateName },
  });

  const defaultDesigns = [
    {
      name: 'Classic Tự Nhiên (Một sợi - Tự nhiên)',
      description:
        'Kỹ thuật nối 1 sợi mi giả lên 1 sợi mi thật (1:1), tạo hiệu ứng hàng mi dài cong tự nhiên nhẹ nhàng, phù hợp cho người mới bắt đầu luyện tập phân tách và đặt mi.',
      difficultyLevel: 'BASIC',
      priceVnd: 0,
      sortOrder: 1,
    },
    {
      name: 'Katun Fox (Hiệu ứng đuôi cáo sắc sảo)',
      description:
        'Kỹ thuật phối các trụ mi dài ngắn xen kẽ kết hợp kéo dài góc đuôi mắt tạo dáng đuôi cáo quyến rũ, đòi hỏi kỹ thuật tạo trụ và kiểm soát form dáng mắt chuẩn xác.',
      difficultyLevel: 'ADVANCED',
      priceVnd: 0,
      sortOrder: 2,
    },
    {
      name: 'Wetlook Mắt Ướt (Hiện đại - Cá tính)',
      description:
        'Kỹ thuật gom ngọn mi chưa bung fan tạo hiệu ứng chùm mi ướt sắc nét, phong cách thịnh hành Âu Mỹ, rèn luyện cách chấm keo gom ngọn và phân tầng mi.',
      difficultyLevel: 'ADVANCED',
      priceVnd: 0,
      sortOrder: 3,
    },
    {
      name: 'Anime Baby Doll (Mắt búp bê Manga)',
      description:
        'Kỹ thuật thiết kế các chùm gai mi Manga anime nổi bật ở trung tâm mắt tạo mắt to tròn ngây thơ, kết hợp fan xòe đệm lớp dưới, đòi hỏi kỹ thuật tạo spike đỉnh cao và kiểm soát độ dài tầng mí.',
      difficultyLevel: 'MASTER',
      priceVnd: 0,
      sortOrder: 4,
    },
  ];

  if (!template) {
    template = await crmPrisma.crmAcademyWorkshopDesignTemplate.create({
      data: {
        title: templateName,
        description:
          'Bộ 4 mẫu thiết kế mi chuẩn salon từ cơ bản đến master: Classic Tự Nhiên, Katun Fox, Wetlook Mắt Ướt, Anime Baby Doll.',
        items: {
          create: defaultDesigns.map((d) => ({
            name: d.name,
            description: d.description,
            difficultyLevel: d.difficultyLevel,
            priceVnd: d.priceVnd,
            sortOrder: d.sortOrder,
          })),
        },
      },
    });
    console.log(`Created default design template id=${template.id} with ${defaultDesigns.length} designs.`);
  } else {
    console.log(`Template already exists (id=${template.id}). Ensuring default designs exist...`);
    const count = await crmPrisma.crmAcademyWorkshopDesignTemplateItem.count({
      where: { templateId: template.id },
    });
    if (count === 0) {
      await crmPrisma.crmAcademyWorkshopDesignTemplateItem.createMany({
        data: defaultDesigns.map((d) => ({
          templateId: template!.id,
          name: d.name,
          description: d.description,
          difficultyLevel: d.difficultyLevel,
          priceVnd: d.priceVnd,
          sortOrder: d.sortOrder,
        })),
      });
      console.log(`Added ${defaultDesigns.length} items to template.`);
    }
  }

  await crmPrisma.$disconnect();
  console.log('Seed finished successfully!');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
