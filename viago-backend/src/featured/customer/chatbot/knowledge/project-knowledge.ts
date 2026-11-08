// Reviewed against backend services and Angular routes. These describe behavior;
// routes, fares, policies and transaction statuses must still be queried live.
export const projectKnowledge = [
  {
    source: 'du-an:dat-ve',
    title: 'Quy trình đặt vé online VIAGO',
    url: '/customer/',
    category: 'HuongDanDatVe',
    content:
      'Tìm điểm đi, điểm đến, ngày và số vé; chọn chuyến, ghế, điểm đón trả; nhập thông tin hành khách; kiểm tra tổng tiền và thanh toán. Backend hỗ trợ tối đa 5 ghế cho một chiều, tối đa 2 ghế mỗi chiều cho khứ hồi. Ghế giữ tối đa 10 phút, có thể ngắn hơn theo cấu hình giữ chỗ và giờ đóng bán của lịch trình. Thay đổi ghế không làm tăng thời hạn giữ đã có. Phải dựa vào expiresAt trả về của đơn. Khứ hồi cần đúng tuyến ngược lại và chuyến về sau giờ đến chuyến đi. Giá cuối cùng được tính lại tại bước kiểm tra đơn, bao gồm ưu đãi hợp lệ. Chatbot chỉ hướng dẫn và tìm chuyến, không giữ ghế hoặc đặt vé.',
    evidence: [
      'src/featured/customer/home/booking/booking.service.ts',
      'src/featured/customer/home/common/home.dto.ts',
      'src/featured/customer/home/catalog/home.service.ts',
    ],
  },
  {
    source: 'du-an:thanh-toan',
    title: 'Thanh toán và xác nhận vé',
    url: '/customer/huong-dan-mua-ve/dat-ve-online',
    category: 'ThanhToan',
    content:
      'Luồng backend đặt vé online hiện dùng VietQR/chuyển khoản và webhook SePay. Chỉ hướng dẫn dùng khi cấu hình runtime xác nhận đã sẵn sàng. Không suy ra MoMo, VNPay hay ZaloPay đang hoạt động chỉ vì có tên trong enum hoặc FAQ. Thanh toán được xác nhận bởi backend sau khi kiểm tra thông báo tiền vào, tài khoản ngân hàng, nội dung, số tiền, thời hạn, chuyến và ghế. Ảnh chuyển khoản hoặc lời khách nói không đủ để khẳng định đã thanh toán. Đã trừ tiền nhưng chưa có vé, giao dịch hai lần, sai tiền hoặc đến muộn cần nhân viên đối soát; chatbot không tự xác nhận, hoàn tiền hoặc xuất vé. Lưu mã vé và thông tin xác nhận sau khi hệ thống báo thành công.',
    evidence: [
      'src/featured/customer/home/booking/booking.service.ts',
      'src/featured/customer/home/common/home.guard.ts',
      'src/featured/customer/home/catalog/home.service.ts',
    ],
  },
  {
    source: 'du-an:hoan-huy',
    title: 'Đổi, hủy vé và hoàn tiền',
    url: '/customer/chinh-sach',
    category: 'HoanHuy',
    content:
      'Chính sách chung phải lấy từ chinh_sach đang áp dụng; điều kiện và tỷ lệ hủy phải tra chinh_sach_huy, chi_tiet_chinh_sach_huy đang có hiệu lực. Không tự đặt mức phí hoặc thời gian hoàn tiền. API hủy đơn của luồng trang chủ chỉ xử lý đơn chưa thanh toán; không đồng nghĩa mọi vé đã thanh toán đều hủy hoặc được hoàn tự động. Yêu cầu đổi vé, hoàn tiền cá nhân cần nhân viên kiểm tra. Chatbot không cập nhật ve_xe, don_hang, ghe_chuyen, thanh_toan, hoan_tien hoặc gọi nghiệp vụ thay đổi giao dịch.',
    evidence: [
      'src/featured/customer/home/booking/booking.service.ts',
      'prisma/schema.prisma',
    ],
  },
  {
    source: 'du-an:trang-thai',
    title: 'Tra cứu chuyến, đơn và vé',
    url: '/customer/tra-cuu-ve',
    category: 'TraCuu',
    content:
      'Tuyến đang hoạt động không bảo đảm có chuyến đang bán. Giá và ghế trống phải truy vấn lịch trình và ghế hiện tại; kết quả tra cứu không phải giữ chỗ. Mã đơn hoặc mã vé do khách nhập không phải bằng chứng sở hữu: chỉ tra thông tin riêng tư sau khi backend xác thực phiên và giới hạn theo khách hàng. Một số màn hình Angular như tra cứu vé, lịch trình, hồ sơ hoặc báo mất đồ còn có dữ liệu mẫu/localStorage; không coi dữ liệu mẫu là dữ liệu vận hành hay bằng chứng giao dịch. Luồng đăng nhập frontend có Firebase và dữ liệu cục bộ, không được suy ra nó tương đương phiên phien_dang_nhap hợp lệ ở backend. Nếu chưa xác thực được, hướng dẫn khách tra cứu ở luồng đặt vé hoặc gặp nhân viên.',
    evidence: [
      'src/featured/customer/home/promotions/promotions.service.ts',
      'src/featured/customer/home/catalog/home.service.ts',
      '../viago-frontend/src/app/core/services/auth.service.ts',
      '../viago-frontend/src/app/featured/customer/ticket-lookup/ticket-lookup.ts',
    ],
  },
  {
    source: 'du-an:ho-tro',
    title: 'Các kênh hỗ trợ VIAGO',
    url: '/customer/lien-he',
    category: 'HoTro',
    content:
      'Website có hướng dẫn đặt vé online, đặt vé qua hotline, nhận vé tại bến, FAQ, chính sách, điều khoản, tin tức và tuyển dụng. Thông tin hotline, email, địa chỉ phải lấy cấu hình hiện tại; không dùng số điện thoại mẫu. Form liên hệ lưu yêu cầu, không đồng nghĩa đã có nhân viên trực tiếp tiếp nhận. Chatbot chuyển ngay khi khách yêu cầu người thật hoặc có sự cố nghiêm trọng. Khi thiếu thông tin đáng tin hoặc khách chưa hài lòng thì hỏi trước khi chuyển. Yêu cầu trong hàng đợi chưa phải kết nối thành công. Khi nhân viên tiếp nhận, AI không chen trả lời. Giải quyết xong vẫn giữ lịch sử và có thể tiếp tục hỏi AI.',
    evidence: [
      'src/featured/customer/about/about.controller.ts',
      'src/featured/customer/about/contact/contact.service.ts',
      '../viago-frontend/src/app/app.routes.ts',
    ],
  },
];
