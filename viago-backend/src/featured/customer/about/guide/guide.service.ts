import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerAboutUsService } from '../about-us/about-us.service';

const guides = [
  {
    id: 'dat-ve-online',
    title: 'Hướng dẫn đặt vé online',
    description:
      'Các bước tìm chuyến, chọn ghế, nhập thông tin và thanh toán trực tuyến.',
    steps: [
      {
        title: 'Chọn hành trình',
        content:
          'Chọn điểm đi, điểm đến, ngày khởi hành và số vé rồi tìm chuyến.',
        image: '/assets/customer/fom_tim_kiem.png',
      },
      {
        title: 'Chọn chuyến xe',
        content: 'Xem giờ chạy, loại xe, giá vé và điểm đón trả.',
        image: '/assets/customer/ket_qua_tim_kiem.png',
      },
      { title: 'Chọn ghế', content: 'Xem sơ đồ ghế và chọn vị trí phù hợp.' },
      {
        title: 'Nhập thông tin hành khách',
        content: 'Điền chính xác họ tên, số điện thoại và thông tin liên hệ.',
      },
      {
        title: 'Kiểm tra và thanh toán',
        content:
          'Kiểm tra thông tin chuyến, chính sách và chọn phương thức thanh toán được hỗ trợ.',
      },
      {
        title: 'Lưu vé và mã đặt chỗ',
        content:
          'Lưu thông tin xác nhận và mã vé để tra cứu, xuất trình khi lên xe.',
      },
    ],
    notes: [
      'Kiểm tra thời gian, điểm đón và thông tin hành khách trước khi xác nhận.',
      'Nếu chưa nhận được xác nhận, kiểm tra trạng thái đặt vé hoặc liên hệ hotline.',
    ],
  },
  {
    id: 'dat-ve-hotline',
    title: 'Đặt vé qua Hotline',
    description:
      'Liên hệ nhân viên VIAGO để được hỗ trợ đặt vé và xác nhận thông tin.',
    steps: [
      {
        title: 'Liên hệ hotline VIAGO',
        content: 'Chuẩn bị điểm đi, điểm đến và ngày khởi hành trước khi gọi.',
      },
      {
        title: 'Cung cấp thông tin chuyến đi',
        content:
          'Thông báo điểm đón trả, thời gian mong muốn, số hành khách và loại xe.',
      },
      {
        title: 'Xác nhận chuyến và giá vé',
        content:
          'Kiểm tra chỗ trống, giá vé và các điều kiện liên quan với nhân viên.',
      },
      {
        title: 'Cung cấp thông tin hành khách',
        content: 'Cung cấp họ tên và số điện thoại liên hệ chính xác.',
      },
      {
        title: 'Thanh toán theo hướng dẫn',
        content: 'Xác nhận số tiền, phương thức và thời hạn thanh toán nếu có.',
      },
      {
        title: 'Nhận xác nhận đặt vé',
        content: 'Kiểm tra mã vé, giờ chạy, điểm đón và hướng dẫn lên xe.',
      },
    ],
    notes: [
      'Hỏi rõ chính sách giữ chỗ, thanh toán, đổi hoặc hủy vé.',
      'Lưu mã vé và thông tin xác nhận trước khi kết thúc cuộc gọi.',
    ],
  },
  {
    id: 'nhan-ve-tai-ben',
    title: 'Cách nhận vé tại bến',
    description: 'Hướng dẫn xác nhận thông tin, nhận vé và làm thủ tục lên xe.',
    steps: [
      {
        title: 'Chuẩn bị thông tin đặt vé',
        content: 'Mang mã vé hoặc mã đặt chỗ và số điện thoại đã đăng ký.',
      },
      {
        title: 'Đến đúng bến hoặc điểm đón',
        content:
          'Đến địa điểm và thời gian được ghi trên vé hoặc hướng dẫn của nhà xe.',
      },
      {
        title: 'Liên hệ quầy vé',
        content: 'Cung cấp mã đặt chỗ để nhân viên tra cứu và xác nhận.',
      },
      {
        title: 'Xác nhận thông tin và nhận vé',
        content:
          'Kiểm tra hành khách, giờ chạy, vị trí ghế và loại vé được sử dụng.',
      },
      {
        title: 'Di chuyển đến khu vực lên xe',
        content:
          'Kiểm tra biển số, tuyến đường, giờ chạy và xuất trình vé khi được yêu cầu.',
      },
    ],
    notes: [
      'Quy trình nhận vé giấy hoặc xác nhận vé điện tử có thể khác nhau tùy chuyến.',
      'Liên hệ quầy vé hoặc hotline nếu không tìm thấy thông tin đặt chỗ.',
    ],
  },
];

@Injectable()
export class CustomerGuideService {
  constructor(private readonly about: CustomerAboutUsService) {}

  findAll() {
    return {
      data: guides.map(({ id, title, description }) => ({
        id,
        title,
        description,
        path: `/customer/huong-dan-mua-ve/${id}`,
      })),
      support: this.about.profile().contact,
    };
  }

  findOne(slug: string) {
    const guide = guides.find((item) => item.id === slug);
    if (!guide) throw new NotFoundException('Không tìm thấy hướng dẫn.');
    return {
      ...guide,
      support: this.about.profile().contact,
      termsPath: '/customer/dieu-khoan',
    };
  }
}
