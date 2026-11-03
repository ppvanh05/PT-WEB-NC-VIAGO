import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { vietnamDate } from '../about.dto';

@Injectable()
export class CustomerAboutUsService {
  constructor(private readonly prisma: PrismaService) {}

  profile() {
    const hotline = process.env.COMPANY_HOTLINE ?? '1900 1234';
    const address =
      process.env.COMPANY_ADDRESS ??
      '869 Đỗ Mười, Khu phố 13, Linh Xuân, TP. HCM';
    return {
      name: 'VIAGO',
      slogan: 'Vạn dặm bình an',
      introduction:
        'Kiến tạo những hành trình di chuyển văn minh, an toàn và đầy cảm hứng. Kết nối niềm vui và sự an tâm trên mọi nẻo đường Việt Nam.',
      mission:
        'Mang lại sự an tâm cho khách hàng bằng sự tận tâm và chuyên nghiệp.',
      story: {
        title: 'Khởi nguồn từ tâm, vươn tầm bằng sự tử tế',
        paragraphs: [
          'Được thành lập với tâm thế của những người yêu mến từng cung đường, VIAGO bắt đầu từ những chiếc xe đầu tiên với tâm nguyện mang lại sự tử tế trong ngành vận tải hành khách. Chúng tôi hiểu rằng mỗi chuyến đi không chỉ là việc di chuyển từ A đến B, mà là sự mong mỏi được trở về nhà, là những cơ hội kinh doanh, hay những chuyến du lịch đầy kỷ niệm.',
          'Suốt nhiều năm hoạt động, VIAGO đã không ngừng cải tiến quy trình, đầu tư vào công nghệ quản lý hiện đại để đảm bảo tính minh bạch và công bằng cho mọi hành khách.',
        ],
        mission:
          "Sứ mệnh của chúng tôi là thực thi triết lý 'Vạn Dặm Bình An'. Chúng tôi cam kết mang lại sự an tâm tuyệt đối cho khách hàng bằng sự tận tâm của đội ngũ lái xe và sự hiện đại của trang thiết bị.",
      },
      coreValues: [
        {
          id: 'safety',
          title: 'An Toàn Là Trên Hết',
          description:
            'Quy trình kiểm tra kỹ thuật nghiêm ngặt và đào tạo lái xe chuyên nghiệp hàng tháng.',
        },
        {
          id: 'responsibility',
          title: 'Trách Nhiệm & Chu Đáo',
          description:
            'Lắng nghe và giải quyết mọi phản hồi của khách hàng với thái độ cầu thị cao nhất.',
        },
        {
          id: 'comfort',
          title: 'Hiện Đại & Tiện Nghi',
          description:
            'Dàn xe đời mới trang bị Wifi, cổng sạc USB, ghế massage và điều hòa lọc khí.',
        },
        {
          id: 'transparency',
          title: 'Công Bằng & Minh Bạch',
          description:
            'Giá vé ổn định, không nhồi nhét, quy trình đặt vé và thanh toán rõ ràng.',
        },
      ],
      vision: {
        year: 2030,
        title: 'Trở thành biểu tượng của sự tin cậy trên mọi hành trình',
        goals: [
          'Chuyển đổi hoàn toàn sang đội xe điện chất lượng cao.',
          'Hệ thống AI điều phối hành trình và dự báo nhu cầu thông minh.',
          'Xây dựng hệ sinh thái vận tải đa phương thức toàn cầu.',
        ],
        images: [
          '/assets/customer/about-us1.png',
          '/assets/customer/about-us2.png',
          '/assets/customer/about-us3.png',
        ],
      },
      heroImage: '/assets/customer/xe.png',
      contact: {
        hotline,
        phone: hotline.replace(/[^\d+]/g, ''),
        email: process.env.COMPANY_EMAIL ?? 'congtyviago@gmail.com',
        address,
        office: 'Tòa nhà ViAGO Tower, Tầng 15',
        officeHours: '06:00 - 22:00',
        officeDays: 'Thứ 2 - Chủ Nhật (kể cả ngày lễ)',
        bookingSupportHours: '24/7',
        mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      },
      links: {
        services: '/customer/dich-vu',
        schedule: '/customer/lich-trinh',
        contact: '/customer/lien-he',
        careers: '/customer/tuyen-dung',
        faq: '/customer/faq',
        guide: '/customer/huong-dan-mua-ve',
        policies: '/customer/chinh-sach',
        terms: '/customer/dieu-khoan',
      },
      galleries: [
        {
          type: 'limousine',
          label: 'Limousine',
          image: '/assets/customer/limo_9_1.jpg',
          pages: [
            {
              title: 'Không gian và ghế ngồi',
              items: [
                {
                  image: '/assets/customer/limo_vip_int.png',
                  title: 'Toàn cảnh khoang hành khách',
                  description: 'Không gian rộng rãi, sang trọng.',
                },
                {
                  image: '/assets/customer/limo_9_1.jpg',
                  title: 'Ghế thương gia',
                  description: 'Ghế ngồi êm ái cho hành trình dài.',
                },
                {
                  image: '/assets/customer/limo_9_2.jpg',
                  title: 'Khoảng để chân',
                  description: 'Không gian duỗi chân thoải mái.',
                },
                {
                  image: '/assets/customer/limo_9_3.jpg',
                  title: 'Bố trí ghế và lối đi',
                  description: 'Thiết kế thuận tiện, riêng tư.',
                },
              ],
            },
            {
              title: 'Tiện nghi và chi tiết',
              items: [
                {
                  image: '/assets/customer/limo_vip_int.png',
                  title: 'Tiện nghi cá nhân',
                  description: 'Mọi nhu cầu trong tầm tay.',
                },
                {
                  image: '/assets/customer/limo_9_2.jpg',
                  title: 'Ánh sáng nội thất',
                  description: 'Ánh sáng dịu nhẹ suốt hành trình.',
                },
                {
                  image: '/assets/customer/limo_vip_ext.png',
                  title: 'Rèm cửa và cửa sổ',
                  description: 'Tận hưởng không gian riêng tư.',
                },
                {
                  image: '/assets/customer/limo_9_seater.png',
                  title: 'Chi tiết hoàn thiện cao cấp',
                  description: 'Tinh tế trong từng đường nét.',
                },
              ],
            },
          ],
        },
        {
          type: 'sleeper',
          label: 'Giường nằm',
          image: '/assets/customer/sleeper_34_1.jpg',
          pages: [
            {
              title: 'Không gian và bố trí giường',
              items: [
                {
                  image: '/assets/customer/sleeper_bus_int.png',
                  title: 'Toàn cảnh khoang giường',
                  description: 'Không gian nghỉ ngơi tiện nghi.',
                },
                {
                  image: '/assets/customer/sleeper_22_1.png',
                  title: 'Bố trí tầng giường',
                  description: 'Sắp xếp khoa học, dễ di chuyển.',
                },
                {
                  image: '/assets/customer/futa_sleeper_int.png',
                  title: 'Không gian giường tầng dưới',
                  description: 'Thoải mái và thoáng đãng.',
                },
                {
                  image: '/assets/customer/sleeper_34_1.jpg',
                  title: 'Không gian giường tầng trên',
                  description: 'Tầm nhìn riêng tư hơn.',
                },
              ],
            },
            {
              title: 'Tiện nghi và riêng tư',
              items: [
                {
                  image: '/assets/customer/sleeper_22_2.jpg',
                  title: 'Đệm và gối',
                  description: 'Êm ái cho giấc ngủ trọn vẹn.',
                },
                {
                  image: '/assets/customer/sleeper_22_3.jpg',
                  title: 'Rèm riêng tư',
                  description: 'Khoảng nghỉ riêng dành cho bạn.',
                },
                {
                  image: '/assets/customer/futa_sleeper_int.png',
                  title: 'Đèn đọc sách và cổng sạc',
                  description: 'Luôn kết nối khi cần.',
                },
                {
                  image: '/assets/customer/sleeper_bus_int.png',
                  title: 'Lối đi và chi tiết nội thất',
                  description: 'Di chuyển thuận tiện giữa các khoang.',
                },
              ],
            },
          ],
        },
        {
          type: 'cabin',
          label: 'Cabin',
          image: '/assets/customer/sleeper_22_1.png',
          pages: [
            {
              title: 'Không gian cabin',
              items: [
                {
                  image: '/assets/customer/futa_cabin_int.png',
                  title: 'Toàn cảnh khoang cabin',
                  description: 'Không gian hiện đại, yên tĩnh.',
                },
                {
                  image: '/assets/customer/palace_cabin_int.png',
                  title: 'Không gian bên trong một cabin',
                  description: 'Riêng tư và tiện nghi.',
                },
                {
                  image: '/assets/customer/futa_cabin_int.png',
                  title: 'Giường hoặc ghế trong cabin',
                  description: 'Thiết kế tối ưu sự thoải mái.',
                },
                {
                  image: '/assets/customer/palace_cabin_int.png',
                  title: 'Không gian lưu trữ',
                  description: 'Sắp xếp hành lý gọn gàng.',
                },
              ],
            },
            {
              title: 'Tiện nghi và chi tiết',
              items: [
                {
                  image: '/assets/customer/palace_cabin_int.png',
                  title: 'Bảng điều khiển và tiện nghi',
                  description: 'Điều khiển dễ dàng trong tầm tay.',
                },
                {
                  image: '/assets/customer/futa_cabin_int.png',
                  title: 'Ánh sáng riêng tư',
                  description: 'Không gian thư giãn theo cách của bạn.',
                },
                {
                  image: '/assets/customer/palace_cabin_int.png',
                  title: 'Vách ngăn và tính riêng tư',
                  description: 'Tách biệt vừa đủ cho hành trình.',
                },
                {
                  image: '/assets/customer/futa_cabin_int.png',
                  title: 'Chi tiết nội thất cabin',
                  description: 'Hoàn thiện chỉn chu, hiện đại.',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  async overview() {
    const start = new Date(`${vietnamDate()}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 86400000);
    const statistics = await this.prisma.$transaction(
      async (tx) => ({
        activeRoutes: await tx.tuyen_xe.count({
          where: { trangthai: 'HoatDong' },
        }),
        activeVehicles: await tx.xe.count({
          where: { trangthai: 'DangHoatDong' },
        }),
        tripsToday: await tx.lich_trinh.count({
          where: {
            trangthai: { not: 'DaHuy' },
            thoigiankhoihanh: { gte: start, lt: end },
          },
        }),
      }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { ...this.profile(), statistics };
  }
}
