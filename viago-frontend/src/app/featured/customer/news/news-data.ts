export type ArticleCategory =
  | 'tin-nha-xe'
  | 'khuyen-mai'
  | 'cam-nang'
  | 'su-kien'
  | 'tuyen-dung';

export type JobType = 'tai-xe' | 'csvc' | 'quan-ly';

export interface Article {
  id: number;
  title: string;
  category: string;
  categoryKey: ArticleCategory;
  date: string;
  author: string;
  excerpt: string;
  imageUrl: string;
  gallery?: string[];
  isFeatured?: boolean;
  route?: string;
  badge?: string;
  discount?: string;
  target?: string;
  eventDate?: string;
  deadline?: string;
  jobType?: JobType;
  logoUrl?: string;
  contentBody?: string;
}

const imageMap: Record<string, string> = {
  'fleet-update': '/assets/customer/viago_promo_deal.png',
  'tet-ticket': '/assets/customer/saigon_transit.png',
  'station': '/assets/customer/terminal_waiting.png',
  'booking-guide': '/assets/customer/bus_57_hiepbinh.png',
  'safety-guide': '/assets/customer/caolanh_lotus.png',
  'route-launch': '/assets/customer/bus_171_172.png',
  'family-travel': '/assets/customer/family_on_bus.png',
  'flash-sale': '/assets/customer/flash_sale_199.png',
  'summer-promo': '/assets/customer/roundtrip_summer.png',
  'voucher': '/assets/customer/promo_national_day.png',
  'student-promo': '/assets/customer/student_discount.png',
  'weekend-promo': '/assets/customer/weekend_roadtrip.png',
  'early-bird': '/assets/customer/flash_sale_199.png',
  'payment-promo': '/assets/customer/viago_promo_deal.png',
  'business-trip': '/assets/customer/mientong_terminal.png',
  'night-bus': '/assets/customer/night_bus_highway.png',
  'luggage-guide': '/assets/customer/bus_sleeper_interior.png',
  'seat-guide': '/assets/customer/mientong_terminal.png',
  'travel-tips': '/assets/customer/caolanh_lotus.png',
  'event-showcase': '/assets/customer/danang_fireworks.png',
  'event-tour': '/assets/customer/caolanh_lotus.png',
  'driver-workshop': '/assets/customer/driver_workshop.png',
  'member-event': '/assets/customer/viago_promo_deal.png',
  'mekong-stop': '/assets/customer/mientong_terminal.png',
  'career-driver': '/assets/customer/saigon_transit.png',
  'career-service': '/assets/customer/bus_171_172.png',
  'career-operator': '/assets/customer/mientong_terminal.png',
  'career-maintenance': '/assets/customer/bus_57_hiepbinh.png',
  'career-manager': '/assets/customer/viago_promo_deal.png'
};

const img = (name: string) => imageMap[name] ?? '/assets/customer/viago_promo_deal.png';

export const ROUTES = [
  'TP.HCM - Đà Lạt',
  'TP.HCM - Nha Trang',
  'Hà Nội - Sa Pa',
  'Đà Nẵng - Huế',
  'Cần Thơ - Rạch Giá',
  'TP.HCM - Phan Thiết',
];

export const ARTICLES: Article[] = [
  {
    id: 1,
    title: 'ĐẶT VÉ VIAGO ONLINE, KHỞI HÀNH NGAY - DEAL HỜI TRONG TAY',
    category: 'Tin tức nhà xe',
    categoryKey: 'tin-nha-xe',
    date: '15/09/2025',
    author: 'Khối Kinh Doanh',
    excerpt: 'Không cần ra bến, không lo chờ đợi – chỉ vài thao tác trên App VIAGO hoặc Website viago.vn, Quý khách đã có vé trong tay cùng ưu đãi cực hấp dẫn.',
    imageUrl: '/assets/customer/viago_promo_deal.png',
    isFeatured: true,
    route: 'TP.HCM - Đà Lạt',
    contentBody: 'Không cần ra bến xếp hàng chờ đợi, chỉ với vài thao tác nhanh gọn trên ứng dụng di động VIAGO hoặc website chính thức viago.vn, Quý khách đã có thể sở hữu vé xe chất lượng cao cùng nhiều ưu đãi hấp dẫn giảm giá trực tiếp từ 2% đến 4%. Dịch vụ đảm bảo giữ chỗ 100%, hoàn tiền nhanh chóng nếu hủy lịch.'
  },
  {
    id: 2,
    title: 'TRẢI NGHIỆM DỊCH VỤ TRUNG CHUYỂN ĐÓN TRẢ ĐIỂM TẠI TP.HCM TỪ NGÀY 06/06/2025',
    category: 'Tin tức nhà xe',
    categoryKey: 'tin-nha-xe',
    date: '06/06/2025',
    author: 'Ban Vận Hành',
    excerpt: 'Dịch vụ trung chuyển đón trả tận nơi của VIAGO giúp quý khách tiết kiệm thời gian di chuyển ra bến xe và tận hưởng hành trình suôn sẻ nhất.',
    imageUrl: '/assets/customer/saigon_transit.png',
    contentBody: 'VIAGO triển khai mở rộng đội xe trung chuyển chất lượng cao đón trả hành khách tại nhiều điểm trung tâm quận nội thành TP.HCM, mang đến trải nghiệm tiện lợi và nhanh chóng.'
  },
  {
    id: 3,
    title: 'TRUNG CHUYỂN MIỄN PHÍ TỪ BẾN XE MIỀN ĐÔNG MỚI CỦA VIAGO',
    category: 'Tin tức nhà xe',
    categoryKey: 'tin-nha-xe',
    date: '06/06/2025',
    author: 'Đội Xe Trung Chuyển',
    excerpt: 'VIAGO triển khai chương trình trung chuyển hoàn toàn miễn phí từ Bến xe Miền Đông mới đến các quận nội thành cho tất cả hành khách mua vé tuyến liên tỉnh.',
    imageUrl: '/assets/customer/mientong_terminal.png',
    contentBody: 'Nhằm hỗ trợ tốt nhất cho hành khách di chuyển tuyến đường dài, VIAGO cung cấp dịch vụ xe trung chuyển miễn phí kết nối Bến xe Miền Đông mới vào trung tâm thành phố.'
  },
  {
    id: 101,
    title: 'VIAGO MỞ THÊM CHUYẾN ĐÀ LẠT - NHA TRANG ĐÁP ỨNG NHU CẦU MÙA HÈ',
    category: 'Tin tức nhà xe',
    categoryKey: 'tin-nha-xe',
    date: '01/01/2026',
    author: 'Ban Vận Hành',
    excerpt: 'Nhằm đáp ứng nhu cầu đi lại ngày càng tăng, VIAGO chính thức bổ sung thêm 5 chuyến xe mỗi ngày trên tuyến Đà Lạt - Nha Trang.',
    imageUrl: '/assets/customer/nha_trang.jpg',
    isFeatured: true,
    route: 'TP.HCM - Nha Trang',
    contentBody: `Chào đón mùa hè 2026, VIAGO chính thức bổ sung thêm 5 chuyến xe Limousine cao cấp mỗi ngày trên tuyến Đà Lạt – Nha Trang nhằm phục vụ lượng khách du lịch ngày càng tăng cao.

Các chuyến mới khởi hành vào các khung giờ: 06:00, 08:30, 12:00, 15:30 và 20:00. Xe Limousine giường nằm 34 chỗ với đầy đủ tiện nghi hiện đại: wifi tốc độ cao, ghế massage, chăn gối cao cấp và nước uống miễn phí.

Giá vé ưu đãi chỉ từ 350.000đ/lượt, đặt vé qua App VIAGO hoặc website viago.vn để nhận thêm nhiều ưu đãi hấp dẫn.

Quý khách có thể liên hệ tổng đài 1900 1234 để được tư vấn và hỗ trợ đặt vé nhanh nhất.`
  },
  {
    id: 102,
    title: 'CẬP NHẬT LỊCH TRÌNH MỚI TẠI BẾN XE MIỀN ĐÔNG MỚI - ÁP DỤNG TỪ HÈ 2026',
    category: 'Tin tức nhà xe',
    categoryKey: 'tin-nha-xe',
    date: '20/05/2026',
    author: 'Ban Vận Hành',
    excerpt: 'Lịch trình mới nhất áp dụng cho mùa hè 2026 sẽ giúp quý khách dễ dàng sắp xếp thời gian cho các hành trình tại BX Miền Đông mới.',
    imageUrl: '/assets/customer/ben_xe.jpg',
    isFeatured: true,
    route: 'TP.HCM - Đà Lạt',
    contentBody: `VIAGO vừa cập nhật toàn bộ lịch trình xuất bến tại Bến xe Miền Đông mới (quận 9, TP.HCM) áp dụng từ ngày 01/06/2026 phục vụ nhu cầu di chuyển mùa hè tăng cao.

Theo đó, tần suất chuyến trên các tuyến trọng điểm như TP.HCM – Đà Lạt, TP.HCM – Nha Trang và TP.HCM – Phan Thiết sẽ tăng thêm từ 3 đến 5 chuyến mỗi ngày, đặc biệt vào dịp cuối tuần và các ngày lễ.

Lịch chuyến chi tiết:
- TP.HCM → Đà Lạt: 08 chuyến/ngày (06:00 – 23:00)
- TP.HCM → Nha Trang: 10 chuyến/ngày (07:00 – 22:00)
- TP.HCM → Phan Thiết: 06 chuyến/ngày (07:30 – 20:30)

Quý khách đặt vé trước 24 giờ qua App VIAGO sẽ được hưởng ưu đãi giảm 5% giá vé. Liên hệ hotline 1900 1234 để biết thêm chi tiết.`
  },
  {
    id: 103,
    title: 'ƯU ĐÃI HÈ RỰC RỠ: GIẢM NGAY 10% GIÁ VÉ CHO TẤT CẢ TUYẾN VIAGO',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '01/06/2026',
    author: 'Viago Rewards',
    excerpt: 'Đón mùa du lịch hè 2026, VIAGO tung chương trình khuyến mãi cực lớn cho tất cả khách hàng đặt vé trực tuyến qua website hoặc ứng dụng.',
    imageUrl: '/assets/customer/summer.jpg',
    isFeatured: true,
    badge: 'HOT',
    discount: '10%',
    target: 'Đặt qua app hoặc web',
    route: 'TP.HCM - Nha Trang',
    contentBody: `Chào mừng mùa hè 2026, VIAGO tung chương trình khuyến mãi đặc biệt SUMMER10 – Giảm ngay 10% toàn bộ giá vé xe cho tất cả hành khách đặt vé trực tuyến qua website viago.vn hoặc ứng dụng VIAGO từ ngày 01/06 đến 31/08/2026.

Điều kiện áp dụng:
- Đặt vé trực tuyến qua App VIAGO hoặc website viago.vn
- Nhập mã khuyến mãi: SUMMER10 khi thanh toán
- Áp dụng cho tất cả tuyến và tất cả loại xe Limousine của VIAGO
- Mỗi tài khoản được sử dụng tối đa 5 lần trong thời gian chương trình

Ngoài ra, khách hàng mới đăng ký tài khoản còn được cộng thêm 50.000đ vào ví VIAGO Pay. Đây là cơ hội vàng để du lịch hè thêm tiết kiệm và thú vị.

Liên hệ tổng đài 1900 1234 hoặc email support@viago.vn nếu cần hỗ trợ thêm.`
  },
  {
    id: 5,
    title: 'KHỞI HÀNH ĐẾN CAO LÃNH TRẢI NGHIỆM TRỌN VẸN LỄ HỘI SEN ĐỒNG THÁP',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '10/05/2025',
    author: 'VIAGO Du Lịch',
    excerpt: 'VIAGO tăng tần suất chuyến xe đưa du khách về miền Tây sông nước tham gia lễ hội sen đặc sắc và nhiều hoạt động văn hóa đặc trưng.',
    imageUrl: '/assets/customer/caolanh_lotus.png',
    contentBody: 'Đồng Tháp Mười vẫy gọi mùa sen nở rộ, VIAGO hân hạnh cung cấp các chuyến xe Limousine giường nằm chạy liên tục đưa khách đi lễ hội sen Cao Lãnh với mức giá ưu đãi.'
  },
  {
    id: 7,
    title: 'CHIÊM NGƯỠNG LỄ HỘI PHÁO HOA QUỐC TẾ ĐÀ NẴNG 2026 DI CHUYỂN CÙNG VIAGO',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '01/06/2026',
    author: 'VIAGO Du Lịch',
    excerpt: 'Đặt vé đi Đà Nẵng xem pháo hoa quốc tế với lịch chạy linh hoạt và chất lượng xe limousine giường phòng VIP cực sang trọng.',
    imageUrl: '/assets/customer/danang_fireworks.png',
    contentBody: 'Lễ hội pháo hoa quốc tế DIFF Đà Nẵng đã sẵn sàng, đội xe cung điện di động VIAGO tăng cường chuyến đón đưa du khách thưởng lãm những bữa tiệc ánh sáng mãn nhãn.'
  },
  {
    id: 9,
    title: 'Flash sale thứ Tư: Vé từ 199.000đ cho tuyến dưới 350km',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '26/06/2026',
    author: 'Viago Rewards',
    excerpt: 'Săn vé giá tốt trong khung 08:00 - 12:00 mỗi thứ Tư, số lượng ưu đãi giới hạn theo từng chuyến.',
    imageUrl: img('flash-sale'),
    badge: 'HOT',
    discount: '199K',
    target: 'Tuyến dưới 350km',
    route: 'TP.HCM - Phan Thiết',
    isFeatured: true,
    contentBody: `Flash sale thứ Tư là chương trình ưu đãi theo ngày dành cho khách đặt vé sớm qua website hoặc ứng dụng Viago.

Mỗi chuyến có số lượng ghế ưu đãi giới hạn. Hành khách hoàn tất thanh toán trước sẽ được giữ giá khuyến mãi.

Chương trình không áp dụng đồng thời với mã giảm giá khác và có thể tạm dừng khi hết ngân sách ưu đãi.`,
  },
  {
    id: 10,
    title: 'Giảm 20% khi đặt vé khứ hồi mùa hè',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '22/06/2026',
    author: 'Viago Rewards',
    excerpt: 'Ưu đãi dành cho hành khách lên kế hoạch đi và về trong cùng một giao dịch đặt vé.',
    imageUrl: img('summer-promo'),
    badge: 'HOT',
    discount: '20%',
    target: 'Vé khứ hồi',
    route: 'TP.HCM - Nha Trang',
    contentBody: `Khi đặt vé khứ hồi trong cùng giao dịch, hành khách được giảm 20% cho chiều về trên các tuyến du lịch mùa hè.

Ưu đãi áp dụng đến hết ngày 31/08/2026 hoặc đến khi chương trình hết số lượng vé ưu đãi.

Hành khách nên kiểm tra kỹ ngày về trước khi thanh toán để giữ lịch trình phù hợp.`,
  },
  {
    id: 11,
    title: 'Mã VIAGO29 giảm 15% cho kỳ nghỉ lễ 2/9',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '18/06/2026',
    author: 'Viago Rewards',
    excerpt: 'Nhập mã trên ứng dụng Viago để nhận ưu đãi cho các chuyến khởi hành trong tuần lễ Quốc khánh.',
    imageUrl: img('voucher'),
    badge: 'Sắp hết',
    discount: '15%',
    target: 'Đặt qua app',
    route: 'TP.HCM - Đà Lạt',
    contentBody: `Mã VIAGO29 áp dụng cho khách đặt vé qua ứng dụng Viago trong giai đoạn chuẩn bị kỳ nghỉ lễ 2/9.

Mỗi tài khoản được dùng một lần, mức giảm tối đa tùy theo giá trị đơn hàng và ngân sách còn lại của chương trình.

Thông tin chi tiết được hiển thị tại bước thanh toán trước khi hành khách xác nhận giao dịch.`,
  },
  {
    id: 12,
    title: 'Ưu đãi sinh viên: Giảm 15% khi xác thực thẻ',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '14/06/2026',
    author: 'Viago Rewards',
    excerpt: 'Chương trình hỗ trợ học sinh, sinh viên di chuyển về trường trong mùa tựu trường.',
    imageUrl: img('student-promo'),
    badge: 'HOT',
    discount: '15%',
    target: 'Học sinh - sinh viên',
    route: 'Hà Nội - Sa Pa',
    contentBody: `Hành khách là học sinh, sinh viên có thể xác thực thẻ tại quầy hoặc trên ứng dụng để nhận ưu đãi.

Sau khi được duyệt, ưu đãi sẽ hiển thị trong tài khoản và tự động áp dụng cho các tuyến đủ điều kiện.

Viago mong muốn giảm bớt chi phí di chuyển trong giai đoạn nhập học và quay lại trường.`,
  },
  {
    id: 13,
    title: 'Tặng voucher 100.000đ cho hội viên Viago Club',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '10/06/2026',
    author: 'Viago Club',
    excerpt: 'Hội viên đạt mốc 10 chuyến hoàn thành trong 6 tháng sẽ nhận voucher cho lần đặt tiếp theo.',
    imageUrl: img('voucher'),
    badge: 'HOT',
    discount: '100K',
    target: 'Hội viên',
    route: 'Đà Nẵng - Huế',
    contentBody: `Viago Club tặng voucher 100.000đ cho hội viên đạt mốc 10 chuyến hoàn thành trong vòng 6 tháng.

Voucher được cộng vào tài khoản sau khi hệ thống xác nhận chuyến thứ 10 đã hoàn tất.

Hội viên có thể dùng voucher cho lần đặt vé tiếp theo trên website hoặc ứng dụng.`,
  },
  {
    id: 14,
    title: 'Combo gia đình: Mua 4 vé giảm thêm 12%',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '08/06/2026',
    author: 'Viago Rewards',
    excerpt: 'Ưu đãi dành cho nhóm gia đình đặt cùng chuyến, cùng điểm đón và thanh toán một lần.',
    imageUrl: img('family-travel'),
    badge: 'Sắp hết',
    discount: '12%',
    target: 'Nhóm 4 khách',
    route: 'TP.HCM - Đà Lạt',
    contentBody: `Khi đặt từ 4 vé trở lên trong cùng một giao dịch, hành khách được giảm thêm 12% trên tổng giá trị đơn hàng.

Chương trình phù hợp với nhóm gia đình đi du lịch hè hoặc về quê cuối tuần.

Số lượng vé ưu đãi được giới hạn theo từng tuyến để đảm bảo năng lực phục vụ.`,
  },
  {
    id: 15,
    title: 'Giảm 10% tuyến Cần Thơ - Rạch Giá trong tháng khai trương',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '05/06/2026',
    author: 'Viago miền Tây',
    excerpt: 'Ưu đãi mở tuyến mới dành cho hành khách đặt vé cuối tuần trong tháng đầu vận hành.',
    imageUrl: img('route-launch'),
    discount: '10%',
    target: 'Tuyến mới',
    route: 'Cần Thơ - Rạch Giá',
    contentBody: `Trong tháng đầu khai trương tuyến Cần Thơ - Rạch Giá, Viago áp dụng ưu đãi giảm 10% cho tất cả vé đặt online.

Chương trình giúp hành khách trải nghiệm tuyến mới với chi phí nhẹ hơn.

Ưu đãi tự động áp dụng tại bước thanh toán nếu chuyến đi thuộc thời gian khuyến mãi.`,
  },
  {
    id: 16,
    title: 'Ưu đãi cuối tuần cho tuyến Đà Nẵng - Huế',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '02/06/2026',
    author: 'Viago miền Trung',
    excerpt: 'Giảm giá cho hành khách đặt vé đi trong ngày thứ Bảy và Chủ nhật trên tuyến ngắn miền Trung.',
    imageUrl: img('weekend-promo'),
    discount: '8%',
    target: 'Cuối tuần',
    route: 'Đà Nẵng - Huế',
    contentBody: `Viago áp dụng ưu đãi cuối tuần cho tuyến Đà Nẵng - Huế nhằm hỗ trợ khách du lịch ngắn ngày.

Hành khách chỉ cần chọn chuyến khởi hành vào thứ Bảy hoặc Chủ nhật, hệ thống sẽ tự động hiển thị mức giảm.

Ưu đãi không áp dụng cho vé đã đổi lịch từ ngày thường sang cuối tuần.`,
  },
  {
    id: 17,
    title: 'Mua vé sớm 7 ngày giảm 10%',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '29/05/2026',
    author: 'Viago Rewards',
    excerpt: 'Đặt chuyến trước ngày khởi hành ít nhất 7 ngày để nhận mức giá tiết kiệm hơn.',
    imageUrl: img('early-bird'),
    discount: '10%',
    target: 'Đặt sớm',
    route: 'TP.HCM - Nha Trang',
    contentBody: `Ưu đãi mua vé sớm áp dụng cho khách đặt chuyến trước ngày khởi hành ít nhất 7 ngày.

Chương trình giúp hành khách chủ động kế hoạch và hỗ trợ Viago điều phối xe hiệu quả hơn.

Mức giảm được hiển thị trực tiếp trên giá vé nếu chuyến đi đáp ứng điều kiện.`,
  },
  {
    id: 18,
    title: 'Mã WELCOME giảm 50.000đ cho tài khoản mới',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '25/05/2026',
    author: 'Viago Rewards',
    excerpt: 'Khách hàng mới đăng ký tài khoản Viago nhận mã ưu đãi cho chuyến đầu tiên.',
    imageUrl: img('voucher'),
    badge: 'HOT',
    discount: '50K',
    target: 'Tài khoản mới',
    route: 'TP.HCM - Phan Thiết',
    contentBody: `Sau khi đăng ký tài khoản mới, hành khách có thể nhập mã WELCOME tại bước thanh toán để nhận ưu đãi.

Mã áp dụng một lần cho chuyến đầu tiên và không quy đổi thành tiền mặt.

Viago khuyến khích hành khách cập nhật số điện thoại chính xác để nhận thông báo chuyến.`,
  },
  {
    id: 19,
    title: 'Ưu đãi thanh toán qua ví điện tử',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '22/05/2026',
    author: 'Viago Payments',
    excerpt: 'Nhận hoàn tiền hoặc giảm trực tiếp khi thanh toán bằng ví điện tử đối tác trên website Viago.',
    imageUrl: img('payment-promo'),
    discount: '30K',
    target: 'Thanh toán online',
    route: 'TP.HCM - Đà Lạt',
    contentBody: `Viago phối hợp cùng các đối tác ví điện tử triển khai ưu đãi thanh toán online cho một số tuyến.

Mức giảm hoặc hoàn tiền phụ thuộc vào từng ví và được hiển thị rõ tại màn hình thanh toán.

Hành khách nên kiểm tra điều kiện chương trình trước khi xác nhận giao dịch.`,
  },
  {
    id: 20,
    title: 'Ưu đãi nhóm công ty cho chuyến team building',
    category: 'Khuyến mãi',
    categoryKey: 'khuyen-mai',
    date: '18/05/2026',
    author: 'Viago Business',
    excerpt: 'Đội ngũ doanh nghiệp được tư vấn lịch xe, điểm đón riêng và mức giá theo số lượng khách.',
    imageUrl: img('business-trip'),
    discount: 'Liên hệ',
    target: 'Doanh nghiệp',
    route: 'TP.HCM - Nha Trang',
    contentBody: `Viago Business hỗ trợ các công ty tổ chức chuyến team building, du lịch hè hoặc công tác ngắn ngày.

Tùy số lượng khách, đội ngũ tư vấn sẽ đề xuất lịch xe, điểm đón và phương án thanh toán phù hợp.

Doanh nghiệp có thể yêu cầu xuất hóa đơn và tổng hợp danh sách hành khách trước chuyến đi.`,
  },
  {
    id: 21,
    title: 'Hướng dẫn đặt vé Viago trong 3 phút',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '21/06/2026',
    author: 'Viago Guide',
    excerpt: 'Các bước chọn tuyến, chọn ghế, nhập thông tin hành khách và thanh toán online nhanh chóng.',
    imageUrl: img('booking-guide'),
    route: 'TP.HCM - Đà Lạt',
    isFeatured: true,
    contentBody: `Để đặt vé, hành khách chọn điểm đi, điểm đến, ngày khởi hành và số lượng vé trên website hoặc ứng dụng Viago.

Sau khi chọn chuyến phù hợp, hệ thống hiển thị sơ đồ ghế để hành khách chọn vị trí còn trống.

Cuối cùng, hành khách nhập thông tin liên hệ, kiểm tra điều kiện vé và hoàn tất thanh toán. Vé điện tử sẽ được gửi qua SMS hoặc email.`,
  },
  {
    id: 22,
    title: 'Chuẩn bị gì trước chuyến xe đêm?',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '17/06/2026',
    author: 'Viago Guide',
    excerpt: 'Gợi ý hành lý, trang phục và thói quen nhỏ giúp chuyến xe đêm thoải mái hơn.',
    imageUrl: img('night-bus'),
    route: 'Hà Nội - Sa Pa',
    contentBody: `Trước chuyến xe đêm, hành khách nên chuẩn bị áo khoác mỏng, tai nghe, nước uống cá nhân và sạc dự phòng.

Nên ăn nhẹ trước khi lên xe, hạn chế đồ uống có cồn và có mặt tại điểm đón đúng giờ để tránh vội vàng.

Nếu dễ say xe, hãy chọn vị trí giữa xe và thông báo với nhân viên khi cần hỗ trợ.`,
  },
  {
    id: 23,
    title: 'Quy định hành lý cần biết khi đi xe limousine',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '12/06/2026',
    author: 'Viago Guide',
    excerpt: 'Tóm tắt trọng lượng, kích thước và các loại hàng hóa cần báo trước với nhà xe.',
    imageUrl: img('luggage-guide'),
    route: 'TP.HCM - Nha Trang',
    contentBody: `Mỗi hành khách nên mang hành lý gọn, có khóa kéo chắc chắn và ghi thông tin liên hệ bên ngoài vali.

Các vật dụng dễ vỡ, thiết bị điện tử hoặc giấy tờ quan trọng nên được giữ trong túi xách tay.

Với hành lý quá khổ, hàng đông lạnh hoặc hàng dễ mùi, hành khách cần liên hệ trước để được hướng dẫn.`,
  },
  {
    id: 24,
    title: 'Mẹo chọn chỗ ngồi cho người dễ say xe',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '08/06/2026',
    author: 'Viago Guide',
    excerpt: 'Chọn vị trí phù hợp, chuẩn bị thuốc và điều chỉnh thói quen ăn uống trước chuyến đi.',
    imageUrl: img('seat-guide'),
    route: 'Đà Nẵng - Huế',
    contentBody: `Người dễ say xe thường nên chọn vị trí giữa xe, tránh ngồi quá cuối xe và hạn chế nhìn màn hình liên tục.

Trước chuyến đi, nên ăn nhẹ, ngủ đủ và chuẩn bị thuốc chống say nếu đã được tư vấn phù hợp.

Trong hành trình, giữ không khí thoáng, uống nước từng ngụm nhỏ và nghỉ mắt khi cần.`,
  },
  {
    id: 25,
    title: 'Lưu ý an toàn khi di chuyển cùng trẻ nhỏ',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '05/06/2026',
    author: 'Viago Guide',
    excerpt: 'Các bước chuẩn bị giấy tờ, đồ dùng cá nhân và lịch nghỉ phù hợp cho gia đình.',
    imageUrl: img('family-travel'),
    route: 'TP.HCM - Đà Lạt',
    contentBody: `Gia đình đi cùng trẻ nhỏ nên chuẩn bị đồ ăn nhẹ, áo khoác, khăn giấy, thuốc cá nhân và bản sao giấy tờ cần thiết.

Khi đặt vé, hãy ghi chú nhu cầu hỗ trợ để nhân viên Viago chủ động hướng dẫn điểm đón và sắp xếp hành lý.

Trong chuyến đi, phụ huynh nên nhắc trẻ thắt dây an toàn và hạn chế đi lại khi xe đang di chuyển.`,
  },
  {
    id: 26,
    title: 'Gợi ý lịch trình cuối tuần TP.HCM - Phan Thiết',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '01/06/2026',
    author: 'Viago Travel',
    excerpt: 'Lịch trình 2 ngày 1 đêm nhẹ nhàng cho nhóm bạn hoặc gia đình muốn đổi gió gần biển.',
    imageUrl: img('travel-tips'),
    route: 'TP.HCM - Phan Thiết',
    contentBody: `Khởi hành tối thứ Sáu hoặc sáng sớm thứ Bảy giúp hành khách có nhiều thời gian nghỉ ngơi tại Phan Thiết.

Ngày đầu có thể dành cho biển, hải sản và các điểm tham quan gần trung tâm. Ngày thứ hai phù hợp với lịch cà phê, mua đặc sản và quay về TP.HCM.

Nên đặt vé về trước để tránh hết chỗ vào chiều Chủ nhật.`,
  },
  {
    id: 27,
    title: 'Cách kiểm tra vé và hóa đơn điện tử',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '28/05/2026',
    author: 'Viago Guide',
    excerpt: 'Hướng dẫn tra cứu mã vé, tải hóa đơn và kiểm tra thông tin hành khách sau thanh toán.',
    imageUrl: img('booking-guide'),
    contentBody: `Sau khi thanh toán, hành khách có thể tra cứu vé bằng số điện thoại hoặc mã đặt chỗ trên website Viago.

Nếu cần hóa đơn, hãy nhập đầy đủ thông tin xuất hóa đơn trước thời hạn quy định.

Mọi thay đổi về giờ chạy hoặc điểm đón sẽ được gửi đến số điện thoại đã đăng ký.`,
  },
  {
    id: 28,
    title: 'Checklist 6 món nên có trong balo du lịch ngắn ngày',
    category: 'Cẩm nang di chuyển',
    categoryKey: 'cam-nang',
    date: '25/05/2026',
    author: 'Viago Travel',
    excerpt: 'Một checklist gọn cho hành khách đi 2-3 ngày bằng xe khách đường dài.',
    imageUrl: img('luggage-guide'),
    route: 'Cần Thơ - Rạch Giá',
    contentBody: `Một balo du lịch ngắn ngày nên có giấy tờ cá nhân, áo khoác mỏng, pin sạc, thuốc cá nhân, bình nước và túi nhỏ đựng đồ vệ sinh.

Hãy để đồ thường dùng ở ngăn dễ lấy, còn vali ký gửi nên khóa kỹ và gắn thẻ thông tin.

Việc chuẩn bị gọn giúp hành khách lên xuống xe nhanh và giảm rủi ro bỏ quên đồ.`,
  },
  {
    id: 29,
    title: 'Ngày hội trải nghiệm xe limousine Viago tại Đà Lạt',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '19/06/2026',
    author: 'Viago Events',
    excerpt: 'Khách tham dự có thể tham quan khoang xe, nhận tư vấn tuyến và nhận mã ưu đãi tại sự kiện.',
    imageUrl: img('event-showcase'),
    eventDate: '12/07/2026',
    route: 'TP.HCM - Đà Lạt',
    isFeatured: true,
    contentBody: `Viago tổ chức ngày hội trải nghiệm xe limousine tại Đà Lạt để hành khách trực tiếp tham quan khoang xe và tiện ích mới.

Sự kiện có khu vực tư vấn tuyến, hướng dẫn đặt vé online và quầy nhận mã ưu đãi cho khách tham dự.

Lịch chi tiết sẽ được cập nhật trên website và fanpage Viago trước ngày diễn ra.`,
  },
  {
    id: 30,
    title: 'Tour trải nghiệm cung đường biển Nha Trang',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '15/06/2026',
    author: 'Viago Events',
    excerpt: 'Lịch trình gợi ý các điểm dừng ven biển dành cho hành khách yêu thích chuyến đi ngắn ngày.',
    imageUrl: img('event-tour'),
    eventDate: '20/07/2026',
    route: 'TP.HCM - Nha Trang',
    contentBody: `Viago giới thiệu tour trải nghiệm cung đường biển Nha Trang với các điểm dừng phù hợp để nghỉ ngơi và chụp ảnh.

Chương trình hướng đến nhóm bạn trẻ, gia đình và khách du lịch muốn có lịch trình rõ ràng nhưng vẫn linh hoạt.

Thông tin đăng ký sẽ được mở theo từng đợt để đảm bảo chất lượng phục vụ.`,
  },
  {
    id: 31,
    title: 'Workshop lái xe an toàn cho đội ngũ tài xế',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '11/06/2026',
    author: 'Đào tạo Viago',
    excerpt: 'Chương trình nội bộ nâng cao kỹ năng xử lý tình huống, giao tiếp và chăm sóc hành khách.',
    imageUrl: img('driver-workshop'),
    eventDate: '05/07/2026',
    contentBody: `Viago tổ chức workshop lái xe an toàn dành cho đội ngũ tài xế đang vận hành trên các tuyến trọng điểm.

Nội dung gồm xử lý tình huống trên đường, kiểm tra xe trước chuyến và giao tiếp với hành khách trong các trường hợp đặc biệt.

Hoạt động đào tạo định kỳ giúp Viago duy trì chất lượng phục vụ ổn định.`,
  },
  {
    id: 32,
    title: 'Lịch sự kiện tri ân hội viên Viago Club tháng 8',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '07/06/2026',
    author: 'Viago Club',
    excerpt: 'Hội viên được mời tham gia quay số, nhận quà lưu niệm và cập nhật quyền lợi mới.',
    imageUrl: img('member-event'),
    eventDate: '08/08/2026',
    contentBody: `Sự kiện tri ân hội viên Viago Club tháng 8 sẽ có hoạt động quay số, quà lưu niệm và giới thiệu quyền lợi mới.

Thư mời được gửi đến hội viên đủ điều kiện qua email hoặc thông báo trong ứng dụng.

Viago mong muốn tạo thêm kết nối với những khách hàng đã đồng hành thường xuyên trên nhiều hành trình.`,
  },
  {
    id: 33,
    title: 'Điểm dừng đặc biệt tại chợ nổi Cái Răng cuối tuần',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '03/06/2026',
    author: 'Viago miền Tây',
    excerpt: 'Một số chuyến cuối tuần có lịch dừng trải nghiệm ngắn tại khu vực chợ nổi theo đăng ký trước.',
    imageUrl: img('mekong-stop'),
    eventDate: '27/07/2026',
    route: 'Cần Thơ - Rạch Giá',
    contentBody: `Viago thử nghiệm điểm dừng trải nghiệm tại khu vực chợ nổi Cái Răng cho một số chuyến cuối tuần.

Hành khách cần đăng ký trước để đội ngũ vận hành sắp xếp thời gian và đảm bảo lịch trình chung.

Hoạt động phù hợp với du khách muốn có thêm trải nghiệm địa phương trên hành trình miền Tây.`,
  },
  {
    id: 34,
    title: 'Mini game hè: Chia sẻ hành trình Viago',
    category: 'Sự kiện',
    categoryKey: 'su-kien',
    date: '30/05/2026',
    author: 'Viago Marketing',
    excerpt: 'Chia sẻ khoảnh khắc chuyến đi và nhận cơ hội nhận voucher cho hành trình tiếp theo.',
    imageUrl: img('summer-promo'),
    eventDate: '01/08/2026',
    contentBody: `Mini game hè khuyến khích hành khách chia sẻ khoảnh khắc đáng nhớ trên các chuyến đi cùng Viago.

Người tham gia đăng ảnh, viết mô tả ngắn và gắn hashtag chương trình theo hướng dẫn trên fanpage.

Các bài dự thi nổi bật sẽ nhận voucher cho hành trình tiếp theo.`,
  },
  {
    id: 35,
    title: 'Tuyển tài xế limousine tuyến TP.HCM - Đà Lạt',
    category: 'Tuyển dụng',
    categoryKey: 'tuyen-dung',
    date: '24/06/2026',
    author: 'Nhân sự Viago',
    excerpt: 'Cần tuyển tài xế có kinh nghiệm đường dài, tác phong chuyên nghiệp và ưu tiên ứng viên từng lái xe khách.',
    imageUrl: img('career-driver'),
    badge: 'Đang tuyển',
    deadline: '15/07/2026',
    jobType: 'tai-xe',
    logoUrl: '/assets/customer/logo.png',
    isFeatured: true,
    contentBody: `Viago tuyển tài xế limousine cho tuyến TP.HCM - Đà Lạt với yêu cầu bằng lái phù hợp, kinh nghiệm đường dài và thái độ phục vụ chuyên nghiệp.

Ứng viên được đào tạo quy trình vận hành, quy chuẩn chăm sóc hành khách và kỹ năng xử lý tình huống.

Hồ sơ gồm căn cước, bằng lái, giấy khám sức khỏe và thông tin kinh nghiệm làm việc gần nhất.`,
  },
  {
    id: 36,
    title: 'Tuyển nhân viên chăm sóc khách hàng ca xoay',
    category: 'Tuyển dụng',
    categoryKey: 'tuyen-dung',
    date: '20/06/2026',
    author: 'Nhân sự Viago',
    excerpt: 'Vị trí hỗ trợ đặt vé, giải đáp lịch trình và tiếp nhận phản hồi của hành khách trên nhiều kênh.',
    imageUrl: img('career-service'),
    badge: 'Đang tuyển',
    deadline: '10/07/2026',
    jobType: 'csvc',
    logoUrl: '/assets/customer/logo.png',
    contentBody: `Nhân viên chăm sóc khách hàng phụ trách tư vấn lịch trình, hỗ trợ đặt vé, xử lý thay đổi chuyến và ghi nhận phản hồi.

Ứng viên cần giao tiếp rõ ràng, kiên nhẫn, biết sử dụng máy tính văn phòng và có khả năng làm việc ca xoay.

Viago có chương trình đào tạo sản phẩm, chính sách vé và kỹ năng xử lý tình huống trước khi nhận ca chính thức.`,
  },
  {
    id: 37,
    title: 'Tuyển điều phối viên bến xe khu vực miền Trung',
    category: 'Tuyển dụng',
    categoryKey: 'tuyen-dung',
    date: '16/06/2026',
    author: 'Nhân sự Viago',
    excerpt: 'Phụ trách kiểm tra danh sách khách, hỗ trợ điểm đón và phối hợp với tài xế trước giờ xe chạy.',
    imageUrl: img('career-operator'),
    badge: 'Đang tuyển',
    deadline: '05/07/2026',
    jobType: 'quan-ly',
    logoUrl: '/assets/customer/logo.png',
    contentBody: `Điều phối viên bến xe chịu trách nhiệm kiểm tra danh sách hành khách, hỗ trợ điểm đón và cập nhật tình trạng chuyến.

Vị trí yêu cầu khả năng tổ chức công việc, giao tiếp tốt và xử lý nhanh các tình huống thay đổi giờ hoặc vị trí đón.

Ứng viên có kinh nghiệm vận tải hành khách là lợi thế.`,
  },
  {
    id: 38,
    title: 'Tuyển kỹ thuật viên bảo dưỡng xe khách',
    category: 'Tuyển dụng',
    categoryKey: 'tuyen-dung',
    date: '11/06/2026',
    author: 'Nhân sự Viago',
    excerpt: 'Làm việc tại xưởng dịch vụ, kiểm tra định kỳ các hạng mục an toàn trước và sau chuyến.',
    imageUrl: img('career-maintenance'),
    badge: 'Đang tuyển',
    deadline: '30/06/2026',
    jobType: 'csvc',
    logoUrl: '/assets/customer/logo.png',
    contentBody: `Kỹ thuật viên bảo dưỡng phụ trách kiểm tra phanh, lốp, hệ thống điện, điều hòa và các tiện ích trong khoang khách.

Ứng viên cần có kiến thức kỹ thuật ô tô, tinh thần cẩn thận và sẵn sàng làm việc theo lịch vận hành.

Viago cung cấp đồng phục, dụng cụ làm việc và lộ trình nâng bậc tay nghề rõ ràng.`,
  },
  {
    id: 39,
    title: 'Tuyển quản lý trạm dịch vụ khách hàng',
    category: 'Tuyển dụng',
    categoryKey: 'tuyen-dung',
    date: '05/06/2026',
    author: 'Nhân sự Viago',
    excerpt: 'Quản lý đội ngũ tại trạm, theo dõi chất lượng phục vụ và phối hợp xử lý phản hồi từ hành khách.',
    imageUrl: img('career-manager'),
    badge: 'Đang tuyển',
    deadline: '25/06/2026',
    jobType: 'quan-ly',
    logoUrl: '/assets/customer/logo.png',
    contentBody: `Quản lý trạm dịch vụ khách hàng phụ trách điều phối nhân sự, giám sát chất lượng phục vụ và theo dõi các chỉ số vận hành tại trạm.

Ứng viên cần có kinh nghiệm quản lý nhóm, kỹ năng giao tiếp tốt và khả năng xử lý vấn đề trong môi trường dịch vụ.

Viago ưu tiên ứng viên từng làm trong lĩnh vực vận tải, du lịch hoặc chăm sóc khách hàng.`,
  },
];

// Curated additional high quality green/blue-themed travel pictures for details page
const fallbackGalleries: string[][] = [
  [
    '/assets/customer/limo_vip_ext.png',
    '/assets/customer/limo_vip_int.png',
    '/assets/customer/about-us1.png'
  ],
  [
    '/assets/customer/viago_sleeper_ext.png',
    '/assets/customer/futa_sleeper_int.png',
    '/assets/customer/about-us2.png'
  ],
  [
    '/assets/customer/viago_sleeper_ext.png',
    '/assets/customer/futa_cabin_int.png',
    '/assets/customer/about-us3.png'
  ]
];

ARTICLES.forEach((art, index) => {
  const customGallery = fallbackGalleries[index % fallbackGalleries.length];
  art.gallery = [art.imageUrl, ...customGallery].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
  while (art.gallery.length < 2) {
    art.gallery.push('/assets/customer/hero_banner.png');
  }
});

