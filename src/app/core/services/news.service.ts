import { Injectable } from '@angular/core';

export interface CommentItem {
  id: string;
  authorName: string;
  avatar?: string;
  createdAt: string;
  content: string;
  likes: number;
  isLiked?: boolean;
  replies?: CommentItem[];
}

export interface NewsItem {
  id: string;
  title: string;
  category: 'news' | 'promotion' | 'guide' | 'event' | 'recruitment';
  categoryLabel: string;
  image: string;
  date: string;
  author: string;
  summary: string;
  content: string;
  isFeatured?: boolean;
  featuredPosition?: 'main' | 'grid-1' | 'grid-2' | 'grid-3' | 'grid-4' | 'sub-highlight' | 'sub-grid-1' | 'sub-grid-2' | 'sub-grid-3';
  tags: string[];
  viewCount: number;
  comments: CommentItem[];
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  // Reliable Unsplash image catalog for transport, buses, promotions, travel, events, corporate
  private imgBus1 = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800';
  private imgBus2 = 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=800';
  private imgBus3 = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800';
  private imgBus4 = 'https://images.unsplash.com/photo-1585503418537-88331351ad99?auto=format&fit=crop&q=80&w=800';
  private imgBus5 = 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&q=80&w=800';

  private imgPromo1 = 'https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&q=80&w=800';
  private imgPromo2 = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800';
  private imgPromo3 = 'https://images.unsplash.com/photo-1471754932861-3a93c96e0b42?auto=format&fit=crop&q=80&w=800';
  private imgPromo4 = 'https://images.unsplash.com/photo-1476514525535-ce74f4581a8b?auto=format&fit=crop&q=80&w=800';
  private imgPromo5 = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&q=80&w=800';

  private imgTravel1 = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800';
  private imgTravel2 = 'https://images.unsplash.com/photo-1553531384-cc14ac007b2b?auto=format&fit=crop&q=80&w=800';
  private imgTravel3 = 'https://images.unsplash.com/photo-1577017040065-650ee4d43339?auto=format&fit=crop&q=80&w=800';
  private imgTravel4 = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800';
  private imgTravel5 = 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3b28?auto=format&fit=crop&q=80&w=800';

  private imgEvent1 = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800';
  private imgEvent2 = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800';
  private imgEvent3 = 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800';
  private imgEvent4 = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800';
  private imgEvent5 = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800';

  private imgRecruit1 = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800';
  private imgRecruit2 = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&q=80&w=800';
  private imgRecruit3 = 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&q=80&w=800';
  private imgRecruit4 = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800';
  private imgRecruit5 = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800';

  private newsList: NewsItem[] = [];

  constructor() {
    this.initNewsData();
  }

  private initNewsData(): void {
    const newsItems: NewsItem[] = [];

    // ==========================================
    // 1. DANH MỤC: KHUYẾN MÃI (PROMOTION) - 15 BÀI
    // ==========================================
    const promotions: NewsItem[] = [
      {
        id: 'deal-hoi-viago-online',
        title: 'ĐẶT VÉ VIAGO ONLINE, KHỎI HÀNH NGAY - DEAL HỜI TRONG TAY',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgBus1,
        date: '15/09/2025',
        author: 'Ban Truyền Thông VIAGO',
        summary: 'Không cần ra bến, không lo chờ đợi – chỉ vài thao tác trên App VIAGO hoặc Website viago.vn, Quý khách đã có vé trong tay cùng ưu đãi cực hấp dẫn.',
        isFeatured: true,
        featuredPosition: 'main',
        tags: ['Khuyến mãi', 'Vé online', 'Tuyến Bắc Nam', 'Ưu đãi'],
        viewCount: 1420,
        content: `
          <p class="lead">Hành trình du lịch và đi lại chưa bao giờ dễ dàng hơn thế! Nhằm tri ân sự tin tưởng của hàng triệu khách hàng trong suốt thời gian qua, VIAGO mang đến chương trình ưu đãi đặc biệt Đặt vé VIAGO Online - Khởi hành ngay - Deal hời trong tay áp dụng cho tất cả các tuyến xe giường nằm và Limousine toàn quốc.</p>
          
          <h3>1. Ưu đãi chiết khấu trực tiếp đến 15%</h3>
          <p>Khi đặt vé qua hệ thống online của Viago, khách hàng sẽ nhận ngay ưu đãi giảm từ 5% đến 15% tổng giá trị đơn hàng khi thanh toán trực tuyến qua Ví ShopeePay, VNPay, ZaloPay hoặc thẻ ngân hàng nội địa. Chương trình áp dụng cho cả vé một chiều và vé khứ hồi trên toàn hệ thống mạng lưới xe liên tỉnh.</p>

          <h3>2. Những lợi ích vượt trội khi đặt vé Online tại Viago</h3>
          <p>Hành khách đặt vé trực tuyến không chỉ nhận được chiết khấu hấp dẫn mà còn được trải nghiệm dịch vụ số hóa hiện đại hàng đầu Việt Nam:</p>
          <ul>
            <li>Chủ động chọn chỗ: Tự do lựa chọn vị trí ghế hoặc giường nằm yêu thích trên sơ đồ xe thực tế 3D trực quan.</li>
            <li>Vé điện tử tiện lợi: Nhận mã vé QR ngay qua SMS và Email, khi lên xe chỉ cần đưa màn hình điện thoại cho tài xế quét mã mà không cần in vé giấy.</li>
            <li>Thanh toán an toàn tuyệt đối: Tích hợp chuẩn bảo mật PCI DSS từ các cổng thanh toán hàng đầu thế giới.</li>
            <li>Tích điểm Viago Rewards: Tích lũy từ 2% đến 5% điểm thưởng cho mỗi lượt đi để quy đổi thành các chuyến đi hoàn toàn miễn phí.</li>
            <li>Đổi trả linh hoạt: Hỗ trợ hoàn vé hoặc thay đổi giờ chạy hoàn toàn tự động trực tiếp trên ứng dụng trước 12 tiếng.</li>
          </ul>

          <h3>3. Hướng dẫn các bước áp dụng mã khuyến mãi</h3>
          <p>Để nhận ngay ưu đãi giảm giá, quý khách chỉ cần thực hiện theo các bước đơn giản sau:</p>
          <ol>
            <li>Truy cập website chính thức viago.vn hoặc mở ứng dụng VIAGO trên điện thoại iOS và Android.</li>
            <li>Nhập thông tin điểm đi, điểm đến, ngày khởi hành mong muốn và số lượng hành khách.</li>
            <li>Lựa chọn chuyến xe phù hợp với thời gian cá nhân và chọn vị trí chỗ ngồi mong muốn trên sơ đồ.</li>
            <li>Tại màn hình thanh toán, nhập mã giảm giá VIAGOONLINE vào ô Mã ưu đãi.</li>
            <li>Kiểm tra lại thông tin đơn hàng, chọn phương thức thanh toán phù hợp và hoàn tất giao dịch.</li>
          </ol>

          <h3>4. Quy định và điều kiện áp dụng</h3>
          <p>Mỗi tài khoản khách hàng được áp dụng tối đa 2 lần mã giảm giá trong suốt thời gian diễn ra chương trình. Mã giảm giá không có giá trị quy đổi thành tiền mặt và không áp dụng song song với các chương trình khuyến mãi doanh nghiệp khác. Mọi thắc mắc về chương trình vui lòng liên hệ Tổng đài CSKH 1900 1234 phục vụ 24/7.</p>

          <blockquote class="custom-quote">
            Đồng hành cùng VIAGO, mỗi chuyến đi của quý khách luôn là một hành trình êm ái, an toàn và tràn ngập niềm vui tiết kiệm!
          </blockquote>
        `,
        comments: [
          { id: 'c1', authorName: 'Nguyễn Văn Minh', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100', createdAt: '2 giờ trước', content: 'Ứng dụng mới cập nhật giao diện mượt mà quá, đặt vé phát ăn ngay!', likes: 8 },
          { id: 'c2', authorName: 'Trần Thị Thu Thảo', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100', createdAt: '5 giờ trước', content: 'Mã giảm giá áp dụng rất tốt, vừa tiết kiệm được 50k cho chuyến TP.HCM đi Đà Lạt hôm qua.', likes: 12 }
        ]
      },
      {
        id: 'flash-sale-thu-tu-199k',
        title: 'Flash sale thứ Tư: Vé từ 199.000đ cho tuyến dưới 350km',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo1,
        date: '26/06/2026',
        author: 'Viago Rewards',
        summary: 'Săn vé giá tốt trong khung 08:00 - 12:00 mỗi thứ Tư, số lượng ưu đãi giới hạn theo từng chuyến.',
        isFeatured: true,
        featuredPosition: 'grid-1',
        tags: ['Flash sale', 'TP.HCM - Phan Thiết', 'Tuyến ngắn'],
        viewCount: 2310,
        content: `
          <p>Mỗi thứ Tư hàng tuần, VIAGO bùng nổ chương trình Flash Sale Ngày Vàng Giờ Vàng mở tung hàng nghìn vé đồng giá chỉ từ 199.000đ áp dụng cho tất cả các tuyến xe có cự ly dưới 350km như TP.HCM đi Vũng Tàu, TP.HCM đi Phan Thiết, Hà Nội đi Quảng Ninh, Đà Nẵng đi Huế và Cần Thơ đi Rạch Giá.</p>
          
          <h3>Khung giờ săn vé và quy mô khuyến mãi</h3>
          <p>Chương trình bắt đầu chính xác từ 08:00 sáng đến 12:00 trưa thứ Tư hàng tuần. Mỗi chuyến xe sẽ dành riêng 5 ghế ưu đãi Flash Sale cho những khách hàng nhanh tay nhất. Đây là cơ hội tuyệt vời để bạn cùng bạn bè và gia đình lên kế hoạch cho những chuyến du lịch cuối tuần với chi phí cực kỳ tối ưu.</p>

          <h3>Các tuyến xe áp dụng trong đợt này</h3>
          <ul>
            <li>Tuyến TP.HCM - Vũng Tàu: Xe Limousine 9 chỗ cao cấp giá từ 199.000đ.</li>
            <li>Tuyến TP.HCM - Phan Thiết / Mũi Né: Xe Giường nằm VIP giá từ 199.000đ.</li>
            <li>Tuyến Hà Nội - Hạ Long / Cẩm Phả: Xe Limousine 11 chỗ giá từ 220.000đ.</li>
            <li>Tuyến Đà Nẵng - Huế: Xe VIP chạy cao tốc La Sơn - Túy Loan giá từ 199.000đ.</li>
          </ul>

          <h3>Bí quyết săn vé Flash Sale thành công</h3>
          <p>Để đảm bảo không bỏ lỡ tấm vé giá tốt, bạn nên chuẩn bị trước các bước sau:</p>
          <ol>
            <li>Đăng ký và hoàn thiện thông tin tài khoản cá nhân trên ứng dụng Viago trước giờ săn vé.</li>
            <li>Lưu sẵn thông tin hành khách và liên kết ví điện tử để thao tác thanh toán trong vòng 30 giây.</li>
            <li>Truy cập mục Flash Sale Thứ Tư trên trang chủ app Viago đúng 08:00 sáng.</li>
            <li>Nhanh tay chọn chuyến và hoàn tất đặt chỗ ngay khi hệ thống mở bán.</li>
          </ol>

          <p>Lưu ý: Vé khuyến mãi Flash Sale không áp dụng hoàn hủy hoặc thay đổi thông tin hành khách sau khi đặt thành công. Hãy chắc chắn về lịch trình trước khi tiến hành thanh toán.</p>
        `,
        comments: [
          { id: 'c3', authorName: 'Lê Hoàng Nam', createdAt: '1 ngày trước', content: 'Thứ 4 tuần nào mình cũng vào săn vé về Phan Thiết, siêu hời luôn.', likes: 4 }
        ]
      },
      {
        id: 'giam-20-ve-khu-hoi-mua-he',
        title: 'Giảm 20% khi đặt vé khứ hồi mùa hè trên toàn quốc',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo2,
        date: '22/06/2026',
        author: 'Ban Truyền Thông',
        summary: 'Thỏa sức vi vu du lịch hè với ưu đãi giảm 20% cho chiều về khi đặt trọn gói vé khứ hồi trên hệ thống VIAGO.',
        isFeatured: true,
        featuredPosition: 'grid-3',
        tags: ['Vé khứ hồi', 'Du lịch hè', 'Khuyến mãi'],
        viewCount: 1750,
        content: `
          <p>Mùa hè là khoảng thời gian lý tưởng nhất trong năm để khởi hành những chuyến du lịch cùng người thân. Nhằm hỗ trợ hành khách tối ưu hóa chi phí di chuyển, VIAGO trân trọng giới thiệu chương trình Đặt Khứ Hồi - Tiết Kiệm Tối Đa giảm ngay 20% giá vé cho lượt về.</p>
          
          <h3>Chi tiết chương trình ưu đãi khứ hồi</h3>
          <p>Khi khách hàng lựa chọn cả chiều đi và chiều về trong cùng một thao tác đặt vé trên website hoặc ứng dụng VIAGO, hệ thống sẽ tự động tính toán và chiết khấu trực tiếp 20% vào giá vé của chiều về. Chương trình áp dụng không giới hạn khoảng cách tuyến đường và thời gian khởi hành giữa hai chiều.</p>

          <h3>Ưu điểm khi đặt mua vé khứ hồi tại Viago</h3>
          <ul>
            <li>Đảm bảo giữ chỗ lượt về trong những ngày cao điểm cuối tuần hoặc lễ tết mà không lo cháy vé.</li>
            <li>Giảm ngay 20% trực tiếp vào hóa đơn mà không cần phải ghi nhớ hay nhập bất kỳ mã voucher nào.</li>
            <li>Hỗ trợ đổi thời gian lượt về hoàn toàn miễn phí 01 lần trước giờ xe chạy 24 tiếng.</li>
            <li>Nhận điểm thưởng tích lũy nhân đôi cho cả hai lượt đi và về trên hệ thống Viago Rewards.</li>
          </ul>

          <h3>Lịch trình gợi ý cho kỳ nghỉ hè hoàn hảo</h3>
          <p>Một số tuyến đường du lịch hè cực hot đang được áp dụng khuyến mãi khứ hồi bao gồm:</p>
          <ol>
            <li>TP.HCM - Đà Lạt: Trải nghiệm không khí mát mẻ của vùng đất ngàn hoa.</li>
            <li>TP.HCM - Nha Trang: Thỏa thích tắm biển và thưởng thức hải sản tươi ngon.</li>
            <li>Hà Nội - Sapa: Chinh phục đỉnh Fansipan và khám phá văn hóa bản địa độc đáo.</li>
            <li>Đà Nẵng - Quy Nhơn: Khám phá những bãi biển hoang sơ tuyệt đẹp miền Trung.</li>
          </ol>

          <p>Hãy truy cập ngay ứng dụng VIAGO để đặt trọn gói vé khứ hồi cho gia đình và tận hưởng kỳ nghỉ hè tràn ngập niềm vui!</p>
        `,
        comments: []
      },
      {
        id: 'ma-viago29-giam-15-le-2-9',
        title: 'Mã VIAGO29 giảm 15% cho kỳ nghỉ lễ Quốc Khánh',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo3,
        date: '18/06/2026',
        author: 'Phòng Marketing',
        summary: 'Chào mừng Quốc Khánh 2/9, Viago tung 5.000 mã giảm 15% cho hành khách đặt vé sớm từ hôm nay.',
        isFeatured: true,
        featuredPosition: 'sub-grid-3',
        tags: ['Quốc khánh 2/9', 'Ưu đãi lễ', 'Giảm 15%'],
        viewCount: 2900,
        content: `
          <p>Chào mừng đại lễ Quốc Khánh 2/9, VIAGO chính thức khởi động chiến dịch Mừng Đại Lễ - Rộn Ràng Chuyến Đi với 5.000 mã ưu đãi giảm 15% dành tặng hành khách đặt vé xe liên tỉnh sớm.</p>
          
          <h3>Thông tin mã giảm giá VIAGO29</h3>
          <p>Hành khách chỉ cần nhập mã VIAGO29 tại bước thanh toán để được giảm ngay 15% tổng giá trị vé xe. Mã áp dụng cho tất cả các loại xe bao gồm Ghế ngồi, Giường nằm tiêu chuẩn, Limousine VIP và Cabin Cung Điện Di Động xuất bến trong giai đoạn từ 28/08 đến hết 05/09.</p>

          <h3>Vì sao nên đặt vé sớm cho đợt nghỉ lễ 2/9?</h3>
          <ul>
            <li>Chủ động chọn được vị trí giường nằm tầng dưới hoặc cabin đôi riêng tư ưng ý.</li>
            <li>Tránh tình trạng hết vé hoặc mua phải vé giá cao từ các kênh xe dù không chính thống.</li>
            <li>Nhận trọn vẹn ưu đãi giảm giá 15% trước khi số lượng 5.000 mã bị quy đổi hết.</li>
            <li>Yên tâm thu xếp hành lý và lịch nghỉ phép cùng người thân gia đình.</li>
          </ul>

          <p>Chương trình có thể kết thúc sớm hơn dự kiến khi toàn bộ 5.000 mã giảm giá được sử dụng hết. Quý khách vui lòng truy cập ứng dụng VIAGO để hoàn tất đặt giữ chỗ ngay hôm nay!</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-he-ruc-ro-giam-10-tat-ca-tuyen',
        title: 'Ưu đãi hè rực rỡ: Giảm ngay 10% giá vé cho tất cả tuyến Viago',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo4,
        date: '01/06/2026',
        author: 'Ban Truyền Thông',
        summary: 'Chào đón mùa hè rực rỡ, Viago dành tặng voucher giảm 10% áp dụng cho toàn bộ lịch trình chuyến xe trên toàn hệ thống.',
        tags: ['Ưu đãi hè', 'Giảm 10%', 'Toàn quốc'],
        viewCount: 2100,
        content: `
          <p>Hè về là thời điểm lý tưởng để xách balo lên và khám phá những vùng đất mới. VIAGO hân hạnh mang đến chương trình Chào Hè Rực Rỡ với ưu đãi giảm 10% cho toàn bộ hơn 500 tuyến xe liên tỉnh trên cả nước.</p>
          <p>Ưu đãi được áp dụng tự động cho khách hàng khi thực hiện thanh toán trực tuyến qua ứng dụng Viago. Không giới hạn số lượt sử dụng và số lượng ghế trong mỗi đơn hàng.</p>
          <h3>Hướng dẫn nhận ưu đãi</h3>
          <ol>
            <li>Mở ứng dụng Viago hoặc truy cập viago.vn.</li>
            <li>Chọn chuyến xe và thời gian di chuyển mong muốn trong tháng 6 và tháng 7.</li>
            <li>Hệ thống tự động trừ 10% giá niêm yết tại bước xác nhận thanh toán.</li>
          </ol>
        `,
        comments: []
      },
      {
        id: 'uu-dai-sinh-vien-giam-15-khi-xac-thuc-the',
        title: 'Ưu đãi sinh viên: Giảm 15% khi xác thực thẻ sinh viên',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo5,
        date: '14/06/2026',
        author: 'Viago Student Program',
        summary: 'Hành khách là học sinh, sinh viên các trường đại học, cao đẳng toàn quốc được hưởng ưu đãi giảm trực tiếp 15% mỗi chuyến đi.',
        tags: ['Sinh viên', 'Giảm 15%', 'Ưu đãi học đường'],
        viewCount: 4200,
        content: `
          <p>Nhằm hỗ trợ các bạn trẻ, học sinh, sinh viên trong việc di chuyển giữa quê nhà và các thành phố lớn để học tập, VIAGO ra mắt chính sách Đồng Hành Cùng Sinh Viên giảm ngay 15% giá vé cho mọi hành trình.</p>
          <p>Các bạn chỉ cần vào mục Tài Khoản trên App Viago, chụp ảnh thẻ sinh viên còn hiệu lực để hệ thống tự động xác minh. Sau khi xác minh thành công, mọi đơn hàng đặt vé của bạn đều sẽ được tự động giảm 15% trọn đời.</p>
        `,
        comments: [
          { id: 'c5', authorName: 'Đỗ Hà My', createdAt: '4 ngày trước', content: 'Thẻ sinh viên của mình duyệt trong 5 phút luôn, quá đỉnh Viago ơi!', likes: 15 }
        ]
      },
      {
        id: 'tich-diem-viago-rewards-nhan-ve-mien-phi',
        title: 'Tích điểm Viago Rewards: Đi càng nhiều, nhận vé càng lớn',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo1,
        date: '25/05/2026',
        author: 'Viago Loyalty Team',
        summary: 'Chương trình khách hàng thân thiết Viago Rewards nâng cấp tỷ lệ tích điểm lên tới 5% cho mỗi chuyến đi hoàn tất.',
        tags: ['Loyalty', 'Tích điểm', 'Vé miễn phí'],
        viewCount: 1980,
        content: `
          <p>Tất cả khách hàng tạo tài khoản trên Viago đều được tự động tham gia chương trình Viago Rewards. Với mỗi chuyến đi hoàn thành, bạn sẽ được cộng tích lũy điểm thưởng tương đương từ 3% đến 5% giá trị vé.</p>
          <p>Điểm thưởng có thể dùng để thanh toán trừ trực tiếp vào các lần đặt vé tiếp theo hoặc quy đổi thành những chuyến đi hoàn toàn miễn phí nhân dịp sinh nhật.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-nhom-dong-giam-toi-25-cho-doan-tu-5-nguoi',
        title: 'Ưu đãi nhóm đông: Giảm tới 25% cho đoàn từ 5 người',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo2,
        date: '20/05/2026',
        author: 'Phòng Doanh Nghiệp',
        summary: 'Đi du lịch theo nhóm bạn hoặc gia đình chưa bao giờ tiết kiệm đến thế với gói giảm giá đặc biệt cho đơn hàng từ 5 vé.',
        tags: ['Đi nhóm', 'Giảm 25%', 'Gia đình'],
        viewCount: 2340,
        content: `
          <p>Khi đặt vé cho các nhóm từ 5 hành khách trở lên trên cùng một chuyến xe, Viago ưu đãi giảm ngay 25% cho vé thứ 5 trở đi. Chương trình vô cùng phù hợp cho các đại gia đình hoặc nhóm bạn thân cùng nhau đi nghỉ mát.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-vi-dientu-zalo-vnpay-giam-50k',
        title: 'Liên kết Ví ZaloPay & VNPay: Giảm ngay 50.000đ cho đơn đầu',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo3,
        date: '15/05/2026',
        author: 'Đối Tác Thanh Toán',
        summary: 'Nhận ngay voucher trị giá 50.000đ khi thực hiện thanh toán vé Viago bằng ví điện tử ZaloPay hoặc VNPay-QR.',
        tags: ['ZaloPay', 'VNPay', 'Voucher 50k'],
        viewCount: 3100,
        content: `
          <p>Nhằm khuyến khích phương thức thanh toán không dùng tiền mặt, Viago hợp tác cùng ZaloPay và VNPay mang tới ưu đãi giảm 50.000đ cho hành khách lần đầu thanh toán vé xe qua hai cổng thanh toán này.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-sinh-nhat-viago-5-tuoi-tang-10000-qua',
        title: 'Mừng sinh nhật Viago 5 tuổi: Bốc thăm 100% trúng quà',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo4,
        date: '10/05/2026',
        author: 'Ban Tổ Chức Sinh Nhật',
        summary: 'Kỷ niệm 5 năm thành lập, Viago dành tặng 10.000 phần quà bao gồm vé xe miễn phí, voucher 100k và tai nghe không dây.',
        tags: ['Sinh nhật Viago', 'Bốc thăm', 'Quà tặng'],
        viewCount: 4500,
        content: `
          <p>Chào đón mốc kim khánh 5 năm phát triển, Viago xin gửi lời cảm ơn chân thành tới quý khách hàng bằng chuỗi sự kiện Vòng Quay May Mắn trên ứng dụng với tỷ lệ trúng quà 100% cho mọi đơn hàng đặt vé thành công trong tháng 5.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-chuyen-dem-giam-15-cho-tuyen-bac-nam',
        title: 'Ưu đãi chuyến đêm: Giảm 15% vé xe giấc ngủ vàng Bắc Nam',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo5,
        date: '05/05/2026',
        author: 'Phòng Điều Hành Chuyến',
        summary: 'Tiết kiệm chi phí lưu trú khách sạn bằng cách chọn các chuyến xe xuất bến từ 21:00 đến 23:30 đêm với giá giảm 15%.',
        tags: ['Chuyến đêm Bắc Nam', 'Giấc ngủ vàng', 'Giảm 15%'],
        viewCount: 1870,
        content: `
          <p>Lựa chọn chuyến xe giường nằm xuất phát ban đêm giúp bạn tiết kiệm trọn vẹn một đêm tiền phòng khách sạn mà vẫn đến nơi đúng giờ sáng sớm. Nhập mã NIGHTBUS để nhận thêm chiết khấu 15% cho các chuyến xe khởi hành sau 21h hàng ngày.</p>
        `,
        comments: []
      },
      {
        id: 'combo-ve-xe-khach-san-dalat-giam-30',
        title: 'Combo Vé xe + Khách sạn Đà Lạt: Giảm sốc tới 30%',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo1,
        date: '01/05/2026',
        author: 'Viago Travel Combo',
        summary: 'Đặt trọn gói vé xe khứ hồi Limousine và phòng khách sạn 3 sao trung tâm Đà Lạt với giá ưu đãi tiết kiệm 30%.',
        tags: ['Combo Đà Lạt', 'Xe + Khách sạn', 'Giảm 30%'],
        viewCount: 3890,
        content: `
          <p>Viago bắt tay cùng hơn 50 khách sạn và resort uy tín tại Đà Lạt giới thiệu gói sản phẩm Du Lịch Trọn Gói Combo Xe & Phòng. Giúp du khách không cần bận tâm tìm kiếm hai dịch vụ riêng lẻ mà vẫn nhận được mức giá ưu đãi nhất thị trường.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-khach-hang-moi-tang-voucher-30k',
        title: 'Chào bạn mới: Tặng ngay Voucher 30.000đ cho chuyến đi đầu tiên',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo2,
        date: '25/04/2026',
        author: 'Viago Growth Team',
        summary: 'Tất cả tài khoản mới đăng ký thành công trên app Viago sẽ nhận ngay mã giảm giá 30.000đ trong ví voucher.',
        tags: ['Bạn mới', 'Voucher 30k', 'Tải app ngay'],
        viewCount: 2980,
        content: `
          <p>Chưa từng sử dụng Viago? Hãy tải ngay app Viago từ App Store hoặc Google Play để nhận ngay quà tặng làm quen trị giá 30.000đ tự động áp dụng cho đơn hàng đầu tiên của bạn.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-tuyen-tay-nguyen-giam-20-ve-cabin',
        title: 'Khám phá Tây Nguyên: Giảm 20% cho dòng xe Cabin Cung Điện',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo3,
        date: '20/04/2026',
        author: 'Ban Tuyến Tây Nguyên',
        summary: 'Trải nghiệm không gian xa hoa của dòng xe Cabin 20 phòng đi BMT, Gia Lai, Kon Tum với mức giảm giá 20%.',
        tags: ['Tây Nguyên', 'Cabin Cung điện', 'Giảm 20%'],
        viewCount: 1650,
        content: `
          <p>Tuyến xe đi các tỉnh Tây Nguyên nay đã được nâng cấp toàn bộ sang dàn xe Cabin đôi Cung điện sang trọng. Nhân dịp khai trương tuyến mới, Viago áp dụng mức giá ưu đãi giảm 20% kéo dài tới hết tháng 5.</p>
        `,
        comments: []
      },
      {
        id: 'uu-dai-cuoi-tuan-xanh-giam-10-moi-thu-7-chu-nhat',
        title: 'Cuối tuần xanh: Giảm 10% khi chọn dòng xe điện Viago Eco',
        category: 'promotion',
        categoryLabel: 'KHUYẾN MÃI',
        image: this.imgPromo4,
        date: '15/04/2026',
        author: 'Viago Green Travel',
        summary: 'Khuyến khích di chuyển xanh thân thiện môi trường với ưu đãi giảm 10% cho các tuyến xe buýt điện liên tỉnh.',
        tags: ['Xe điện Eco', 'Cuối tuần xanh', 'Giảm 10%'],
        viewCount: 1430,
        content: `
          <p>Chung tay bảo vệ môi trường cùng Viago! Khi lựa chọn dòng xe điện Viago Eco cho chuyến đi vào thứ Bảy và Chủ Nhật, quý khách sẽ nhận được voucher ưu đãi 10% đồng thời góp phần giảm thiểu lượng khí thải carbon trên hành trình.</p>
        `,
        comments: []
      }
    ];

    // ==========================================
    // 2. DANH MỤC: TIN TỨC NHÀ XE (NEWS) - 15 BÀI
    // ==========================================
    const news: NewsItem[] = [
      {
        id: 'viago-city-bus-tieu-diem',
        title: 'TIÊU ĐIỂM VIAGO CITY BUS: HỆ THỐNG GIAO THÔNG XANH ĐÔ THỊ',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus3,
        date: '20/06/2026',
        author: 'Viago News',
        summary: 'Đồng hành cùng giao thông công cộng đô thị xanh hiện đại và tiện lợi tại các thành phố lớn.',
        isFeatured: true,
        featuredPosition: 'sub-highlight',
        tags: ['City Bus', 'Xe buýt xanh', 'Tin nhà xe'],
        viewCount: 1890,
        content: `
          <p>Dự án Viago City Bus đánh dấu bước chuyển mình quan trọng của tập đoàn VIAGO trong việc hiện đại hóa mạng lưới xe buýt đô thị thông minh. Với 100% dòng xe điện thân thiện với môi trường, Viago City Bus hứa hẹn mang lại hành trình di chuyển xanh - sạch - văn minh cho người dân toàn quốc.</p>
          <h3>Chất lượng dịch vụ chuẩn 5 sao trên tuyến xe buýt đô thị</h3>
          <p>Các xe buýt điện Viago City Bus đều được trang bị hệ thống điều hòa kháng khuẩn thông minh, Wifi tốc độ cao miễn phí, cổng sạc USB tại từng vị trí ghế ngồi và màn hình hiển thị lộ trình LCD sắc nét.</p>
          <ul>
            <li>Tần suất chuyến dày đặc: 10 - 15 phút/chuyến từ 05:00 sáng đến 22:30 đêm.</li>
            <li>Thanh toán thẻ không tiếp xúc: Chấp nhận thẻ ngân hàng, ví điện tử và thẻ xe buýt thông minh Viago Pass.</li>
            <li>Sàn xe hạ thấp thông minh: Hỗ trợ người cao tuổi, trẻ em và xe lăn của người khuyết tật di chuyển dễ dàng.</li>
          </ul>
        `,
        comments: []
      },
      {
        id: 'trung-chuyen-mien-phi-ben-xe-mien-dong-moi',
        title: 'Trung chuyển miễn phí từ Bến xe Miền Đông Mới của Viago',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus2,
        date: '06/06/2026',
        author: 'Ban Điều Hành Xe',
        summary: 'VIAGO triển khai chương trình trung chuyển hoàn toàn miễn phí từ Bến xe Miền Đông mới đến các quận nội thành cho tất cả hành khách.',
        tags: ['Trung chuyển', 'Bến xe Miền Đông', 'Miễn phí'],
        viewCount: 1640,
        content: `
          <p>Nhằm giải quyết khó khăn trong việc di chuyển của hành khách từ Bến xe Miền Đông Mới (TP. Thủ Đức) về trung tâm TP.HCM, nhà xe VIAGO chính thức đưa vào vận hành dàn xe trung chuyển 16 chỗ hiện đại, đón trả khách miễn phí tận nhà tại các quận: Quận 1, 3, 5, 10, Bình Thạnh, Phú Nhuận, Thủ Đức.</p>
          <p>Hành khách chỉ cần đăng ký địa điểm đón trả khi book vé trực tuyến hoặc gọi hotline 1900 1234 trước giờ khởi hành 2 tiếng.</p>
        `,
        comments: [
          { id: 'c4', authorName: 'Phạm Minh Đức', createdAt: '3 ngày trước', content: 'Dịch vụ trung chuyển này tiện quá, không lo tốn tiền gọi taxi ra bến mới nữa!', likes: 6 }
        ]
      },
      {
        id: 'khai-truong-tuyen-cabin-vip-hcm-nha-trang',
        title: 'Khai trương tuyến xe Cabin VIP 20 phòng TP.HCM - Nha Trang',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus4,
        date: '08/06/2026',
        author: 'Ban Giám Đốc',
        summary: 'Dòng xe Cabin đôi & Cabin đơn riêng tư chuẩn 5 sao với tai nghe Bluetooth, màn hình Android giải trí cao cấp chính thức đi vào hoạt động.',
        tags: ['Cabin VIP', 'Nha Trang', 'Dịch vụ mới'],
        viewCount: 2890,
        content: `
          <p>Đáp ứng nhu cầu di chuyển cao cấp của du khách tới thành phố biển Nha Trang, VIAGO đưa vào vận hành 10 xe Cung Điện Di Động với không gian cabin riêng tư tuyệt đối.</p>
          <p>Mỗi cabin trang bị giường bọc da gập chỉnh điện massage, màn hình giải trí 21 inch tích hợp Netflix, Youtube và tai nghe không dây chụp tai chống ồn cao cấp.</p>
        `,
        comments: []
      },
      {
        id: 'viago-mo-rong-duong-bay-mat-dat-mien-tay',
        title: 'Viago mở rộng đường bay mặt đất miền Tây: TP.HCM - Cần Thơ - Rạch Giá',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus5,
        date: '20/05/2026',
        author: 'Phòng Phát Triển Tuyến',
        summary: 'Tăng cường 40 chuyến mỗi ngày kết nối các tỉnh Đồng bằng sông Cửu Long với tần suất 30 phút/chuyến.',
        tags: ['Miền Tây', 'Cần Thơ', 'Rạch Giá'],
        viewCount: 1450,
        content: `
          <p>VIAGO chính thức đưa vào khai thác tuyến xe mới kết nối TP.HCM với các tỉnh miền Tây gồm Cần Thơ, An Giang và Kiên Giang. Với tần suất 30 phút/chuyến liên tục trong ngày, hành khách sẽ dễ dàng sắp xếp lịch trình cá nhân.</p>
        `,
        comments: []
      },
      {
        id: 'chinh-sach-hoan-doi-ve-linh-hoat-247',
        title: 'Chính sách hoàn/đổi vé linh hoạt 24/7 trên ứng dụng Viago',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus1,
        date: '05/05/2026',
        author: 'Phòng CSKH',
        summary: 'Đổi lịch đi hoặc hủy vé nhận hoàn tiền 100% về ví chỉ trong 60 giây trước giờ xe chạy 12 tiếng.',
        tags: ['Chính sách vé', 'Hoàn tiền', 'Đổi lịch'],
        viewCount: 2100,
        content: `
          <p>Viago nâng cấp quy trình đổi trả vé hoàn toàn tự động trực tiếp trên app mobile. Khách hàng chỉ cần bấm nút Yêu cầu hủy/đổi vé, tiền sẽ được hoàn về Ví Viago hoặc tài khoản ngân hàng liên kết trong vòng 60 giây.</p>
        `,
        comments: []
      },
      {
        id: 'viago-dat-chung-nhan-nha-xe-an-toan-nhat-2026',
        title: 'Viago đạt chứng nhận Nhà xe An toàn nhất năm 2026',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus2,
        date: '28/04/2026',
        author: 'Ủy Ban An Toàn Giao Thông',
        summary: '100% đoàn xe Viago được trang bị hệ thống cảnh báo buồn ngủ và camera AI giám sát hành trình.',
        tags: ['An toàn giao thông', 'Chứng nhận 2026', 'Camera AI'],
        viewCount: 1780,
        content: `
          <p>Bộ Giao Thông Vận Tải vừa trao tặng giải thưởng Doanh Nghiệp Vận Tải Hành Khách An Toàn Tiêu Biểu năm 2026 cho nhà xe Viago nhờ ứng dụng công nghệ giám sát tài xế bằng trí tuệ nhân tạo AI.</p>
        `,
        comments: []
      },
      {
        id: 'khai-truong-tram-dung-chan-5-sao-tai-phan-thiet',
        title: 'Khai trương Trạm dừng nghỉ chuẩn 5 sao Viago Rest Stop tại Phan Thiết',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus3,
        date: '18/04/2026',
        author: 'Ban Quản Lý Trạm',
        summary: 'Trạm dừng nghỉ rộng 3 hecta với khu vệ sinh dát vàng sang trọng, nhà hàng ẩm thực đa dạng và khu vui chơi trẻ em.',
        tags: ['Trạm dừng nghỉ', 'Phan Thiết', 'Dịch vụ 5 sao'],
        viewCount: 3200,
        content: `
          <p>Nhằm đem lại sự thoải mái tối đa cho hành khách trong các chuyến đi dài, Viago đưa vào hoạt động Trạm dừng nghỉ Viago Rest Stop ngay trên tuyến cao tốc Dầu Giây - Phan Thiết.</p>
        `,
        comments: []
      },
      {
        id: 'viago-dua-200-xe-limousine-moi-phuc-vu-tet',
        title: 'Viago đầu tư 200 xe Limousine phiên bản mới phục vụ hành khách',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus4,
        date: '10/04/2026',
        author: 'Ban Đầu Tư Đoàn Xe',
        summary: 'Dàn xe mới được cải tiến với khoảng cách giường rộng hơn 20cm và trang bị ổ sạc nhanh Type-C cho thiết bị di động.',
        tags: ['Đoàn xe mới', 'Limousine 2026', 'Nâng cấp'],
        viewCount: 1950,
        content: `
          <p>Tập đoàn Viago hoàn tất hợp đồng mua mới 200 xe Limousine VIP thế hệ thứ 5 để bổ sung cho các tuyến xe du lịch trọng điểm miền Trung và phía Nam.</p>
        `,
        comments: []
      },
      {
        id: 'viago-dat-moc-10-trieu-luot-khach-nam-2026',
        title: 'Viago cán mốc phục vụ 10 triệu lượt hành khách trong năm 2026',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus5,
        date: '02/04/2026',
        author: 'Ban Tổng Giám Đốc',
        summary: 'Mốc kỷ lục mới khẳng định vị thế dẫn đầu trong lĩnh vực vận tải hành khách chất lượng cao tại Việt Nam.',
        tags: ['Kỷ lục 10 triệu', 'Vận tải Viago', 'Tri ân'],
        viewCount: 4100,
        content: `
          <p>Hôm nay, chuyến xe mang số hiệu VG-888 xuất bến từ Hà Nội đã chính thức chào đón vị khách thứ 10 triệu trong năm 2026 của nhà xe Viago. Vị khách may mắn nhận được phần quà là 01 năm đi xe Viago miễn phí.</p>
        `,
        comments: []
      },
      {
        id: 'viago-trien-khai-dich-vu-giao-hang-hoa-trieu-toc',
        title: 'Khai trương dịch vụ Giao hàng hỏa tốc Viago Express 6 tiếng',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus1,
        date: '25/03/2026',
        author: 'Viago Express',
        summary: 'Gửi hàng hóa, bưu phẩm liên tỉnh giao tận tay người nhận chỉ từ 4 đến 6 tiếng thông qua mạng lưới xe khách.',
        tags: ['Gửi hàng hỏa tốc', 'Viago Express', 'Giao 6h'],
        viewCount: 2200,
        content: `
          <p>Tận dụng tần suất chạy xe liên tục hàng ngày, Viago Express cam kết vận chuyển hàng hóa, thư từ hỏa tốc từ TP.HCM đi Đà Lạt, Nha Trang, Cần Thơ trong thời gian kỷ lục dưới 6 tiếng.</p>
        `,
        comments: []
      },
      {
        id: 'viago-hop-tac-cung-cuc-du-lich-quoc-gia',
        title: 'Viago ký kết hợp tác chiến lược cùng Cục Du Lịch Quốc Gia',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus2,
        date: '18/03/2026',
        author: 'Phòng Đối Ngoại',
        summary: 'Phát động chương trình Quảng bá điểm đến Việt Nam An toàn - Thân thiện - Hấp dẫn trên toàn bộ màn hình giải trí xe Viago.',
        tags: ['Du lịch quốc gia', 'Hợp tác chiến lược', 'Quảng bá'],
        viewCount: 1340,
        content: `
          <p>Lễ ký kết thỏa thuận hợp tác giữa Viago và Cục Du Lịch Quốc Gia Việt Nam nhằm xúc tiến các chiến dịch quảng bá hình ảnh đất nước tới du khách trong và ngoài nước thông qua các chuyến xe liên tỉnh.</p>
        `,
        comments: []
      },
      {
        id: 'viago-ap-dung-cong-nghe-nhan-dien-khuon-mat',
        title: 'Viago ứng dụng quét khuôn mặt FaceID khi lên xe',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus3,
        date: '10/03/2026',
        author: 'Viago Tech Lab',
        summary: 'Hành khách đã xác thực ứng dụng có thể lên xe trong 2 giây mà không cần trình vé hay giấy tờ cá nhân.',
        tags: ['FaceID lên xe', 'Công nghệ 4.0', 'Tốc độ'],
        viewCount: 2800,
        content: `
          <p>Viago thử nghiệm thành công công nghệ check-in thông minh bằng nhận diện khuôn mặt FaceID tại các bến xe lớn ở Hà Nội và TP.HCM, rút ngắn thời gian làm thủ tục lên xe xuống còn 2 giây.</p>
        `,
        comments: []
      },
      {
        id: 'viago-mo-tuyen-xe-VIP-di-cam-pu-chia',
        title: 'Khai trương tuyến xe VIP quốc tế TP.HCM - Nông Pênh (Campuchia)',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus4,
        date: '02/03/2026',
        author: 'Ban Chuyến Quốc Tế',
        summary: 'Tuyến xe liên vận quốc tế với thủ tục thông quan ưu tiên nhanh chóng chỉ mất 15 phút tại cửa khẩu Mộc Bài.',
        tags: ['Tuyến quốc tế', 'Campuchia', 'Phnom Penh'],
        viewCount: 3500,
        content: `
          <p>Đánh dấu bước vươn tầm ra khu vực Đông Nam Á, Viago chính thức đưa dàn xe Limousine 22 chỗ vào phục vụ du khách di chuyển giữa TP.HCM và thủ đô Phnom Penh của Campuchia.</p>
        `,
        comments: []
      },
      {
        id: 'viago-cap-nhat-wifi-6-tren-toan-bo-doan-xe',
        title: 'Nâng cấp kết nối Internet Wifi 6 tốc độ cao trên toàn bộ đoàn xe Viago',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus5,
        date: '22/02/2026',
        author: 'Đội Hạ Tầng Công Nghệ',
        summary: 'Hành khách có thể thoải mái xem phim 4K, làm việc trực tuyến và chơi game mượt mà suốt chặng đường.',
        tags: ['Wifi 6 tốc độ cao', 'Nâng cấp công nghệ', 'Trải nghiệm'],
        viewCount: 1670,
        content: `
          <p>Viago hoàn tất lắp đặt thiết bị phát Wifi 6 vệ tinh thế hệ mới trên 500 đầu xe liên tỉnh, đảm bảo kết nối Internet luôn ổn định ngay cả khi xe đi qua các đoạn đường đèo núi phức tạp.</p>
        `,
        comments: []
      },
      {
        id: 'viago-ra-mat-tong-dai-tro-ly-ao-ai-smart-call',
        title: 'Ra mắt Tổng đài Trợ lý ảo AI SmartCall giải đáp thông tin 24/7',
        category: 'news',
        categoryLabel: 'TIN TỨC NHÀ XE',
        image: this.imgBus1,
        date: '15/02/2026',
        author: 'Trung Tâm AI Viago',
        summary: 'Trợ lý giọng nói thông minh hiểu được 3 miền Bắc - Trung - Nam, trả lời thắc mắc lịch trình chỉ trong 3 giây.',
        tags: ['Trợ lý AI', 'SmartCall', 'CSKH 24/7'],
        viewCount: 2050,
        content: `
          <p>Nhằm nâng cao năng lực phục vụ hàng chục nghìn cuộc gọi mỗi ngày, Viago ra mắt Trợ lý ảo AI có khả năng giao tiếp tự nhiên bằng giọng nói vùng miền để hỗ trợ khách hàng tra cứu lịch chạy xe và giá vé.</p>
        `,
        comments: []
      }
    ];

    // ==========================================
    // 3. DANH MỤC: CẨM NANG DI CHUYỂN (GUIDE) - 15 BÀI
    // ==========================================
    const guides: NewsItem[] = [
      {
        id: 'huong-dan-dat-ve-3-phut',
        title: 'Hướng dẫn đặt vé xe Viago trực tuyến siêu nhanh trong 3 phút',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel1,
        date: '21/06/2026',
        author: 'Đội ngũ Hỗ trợ',
        summary: 'Chi tiết từng bước tìm kiếm chuyến xe, lựa chọn vị trí ghế ngồi và thanh toán trực tuyến siêu nhanh chóng.',
        isFeatured: true,
        featuredPosition: 'grid-4',
        tags: ['Hướng dẫn', 'Cẩm nang', 'Mẹo hay'],
        viewCount: 3120,
        content: `
          <p>Bạn là người mới lần đầu sử dụng nền tảng VIAGO? Hãy tham khảo ngay hướng dẫn 4 bước siêu đơn giản sau đây để sở hữu tấm vé xe ưng ý chỉ trong 3 phút ngắn ngủi:</p>
          <ol>
            <li>Bước 1: Tìm chuyến xe: Điền Điểm đi, Điểm đến và Ngày đi mong muốn tại thanh tìm kiếm trang chủ.</li>
            <li>Bước 2: Chọn chuyến và vị trí ghế: Lọc thời gian xuất bến thích hợp, lựa chọn loại xe giường nằm hoặc Limousine và nhấp chọn vị trí ghế trên sơ đồ 3D.</li>
            <li>Bước 3: Điền thông tin hành khách: Nhập họ tên, số điện thoại và email nhận mã vé điện tử.</li>
            <li>Bước 4: Thanh toán trực tuyến: Lựa chọn cổng thanh toán phù hợp và hoàn tất giao dịch để nhận mã vé QR ngay tức thì.</li>
          </ol>
        `,
        comments: []
      },
      {
        id: 'cam-nang-chuand-bi-hanh-ly-xe-giuong-nam',
        title: 'Cẩm nang chuẩn bị hành lý gọn nhẹ khi đi xe giường nằm đường dài',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel2,
        date: '10/06/2026',
        author: 'Chuyên gia Di chuyển Viago',
        summary: 'Bỏ túi những mẹo sắp xếp hành lý thông minh giúp chuyến đi xe khách giường nằm xa trở nên vô cùng thoải mái.',
        tags: ['Mẹo di chuyển', 'Hành lý', 'Kinh nghiệm'],
        viewCount: 1580,
        content: `
          <p>Đi xe khách đường dài đòi hỏi bạn phải sắp xếp đồ đạc khéo léo để vừa đảm bảo đúng quy định trọng lượng hành lý ký gửi, vừa có đủ đồ dùng cần thiết bên người trong suốt hành trình.</p>
          <h3>Những vật dụng bắt buộc nên mang theo lên khoang xe</h3>
          <ul>
            <li>Giấy tờ tùy thân: CCCD hoặc hộ chiếu để đối chiếu thông tin khi lên xe.</li>
            <li>Thiết bị di động và sạc dự phòng: Giúp bạn thoải mái giải trí và làm việc.</li>
            <li>Thuốc chống say xe và vật dụng vệ sinh cá nhân nhỏ gọn.</li>
            <li>Áo khoác nhẹ hoặc khăn quàng để giữ ấm khi điều hòa xe chạy lạnh về đêm.</li>
          </ul>
        `,
        comments: []
      },
      {
        id: 'kinh-nghiem-san-ve-tet-nguyen-dan-2027',
        title: 'Kinh nghiệm săn vé xe Tết Nguyên Đán không lo cháy vé hay đội giá',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel3,
        date: '02/06/2026',
        author: 'Ban Biên Tập Viago',
        summary: 'Tổng hợp thời điểm mở bán vé Tết của các tuyến Bắc - Nam và bí kíp đặt vé giữ chỗ an toàn tuyệt đối.',
        tags: ['Vé Tết', 'Cẩm nang', 'Mẹo săn vé'],
        viewCount: 5120,
        content: `
          <p>Vé xe Tết luôn là mối quan tâm hàng đầu của những người con xa xứ mỗi dịp xuân về. Hãy lưu ý các mốc thời gian mở bán vé Tết chính thức của Viago và các mẹo giữ chỗ thành công 100%.</p>
        `,
        comments: []
      },
      {
        id: 'top-10-dia-diem-checkin-da-lat-hot-nhat',
        title: 'Top 10 địa điểm check-in Đà Lạt hot nhất mùa hè này bạn không nên bỏ lỡ',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel4,
        date: '25/05/2026',
        author: 'Blogger Du Lịch',
        summary: 'Gợi ý lịch trình 3 ngày 2 đêm cùng danh sách các quán cà phê ngắm hoàng hôn đốn tim du khách tại Đà Lạt.',
        tags: ['Đà Lạt', 'Du lịch', 'Check-in'],
        viewCount: 4320,
        content: `
          <p>Đà Lạt luôn biết cách chiều lòng du khách bởi không khí se lạnh thơ mộng và hàng trăm tọa độ sống ảo cực chill. Bài viết này sẽ tổng hợp 10 điểm đến hot nhất mùa hè 2026.</p>
        `,
        comments: []
      },
      {
        id: 'cam-nang-an-uong-nghi-ngoi-khoa-hoc-xe-duong-dai',
        title: 'Cẩm nang ăn uống và nghỉ ngơi khoa học khi đi xe đường dài',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel5,
        date: '01/05/2026',
        author: 'Bác sĩ Tư vấn Sức khỏe',
        summary: 'Tránh say xe, mệt mỏi và mất ngủ bằng những thói quen dinh dưỡng đơn giản trước và trong chuyến đi.',
        tags: ['Sức khỏe chuyến đi', 'Tránh say xe', 'Dinh dưỡng'],
        viewCount: 1980,
        content: `
          <p>Say xe và mệt mỏi là nỗi ám ảnh của nhiều người khi di chuyển liên tỉnh. Áp dụng ngay lời khuyên dinh dưỡng từ bác sĩ để có chuyến đi luôn khỏe khoắn.</p>
        `,
        comments: []
      },
      {
        id: 'meo-chon-cho-ngoi-xe-giuong-nam-khong-say-xe',
        title: 'Bí quyết chọn vị trí giường nằm êm ái nhất không lo say xe',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel1,
        date: '20/04/2026',
        author: 'Viago Support',
        summary: 'Nên chọn tầng trên hay tầng dưới, đầu xe hay giữa xe để có trải nghiệm di chuyển êm ái nhất?',
        tags: ['Chọn vị trí ghế', 'Tránh say xe', 'Mẹo đặt vé'],
        viewCount: 3400,
        content: `
          <p>Lựa chọn vị trí giường nằm quyết định đến 80% sự dễ chịu trong suốt chuyến đi. Với những người dễ bị say xe, hãy ưu tiên chọn các dãy giường tầng dưới ở khu vực giữa xe.</p>
        `,
        comments: []
      },
      {
        id: 'kinh-nghiem-du-lich-nha-trang-tu-tuc-tiet-kiem',
        title: 'Kinh nghiệm du lịch Nha Trang tự túc 3 ngày 2 đêm siêu tiết kiệm',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel2,
        date: '12/04/2026',
        author: 'Viago Travel Guide',
        summary: 'Bật mí chi tiết chi phí ăn uống, đi lại bằng xe limousine và vé tham quan các đảo đẹp nhất Nha Trang.',
        tags: ['Nha Trang tự túc', 'Kinh nghiệm du lịch', 'Tiết kiệm'],
        viewCount: 2900,
        content: `
          <p>Nha Trang với biển xanh cát trắng nắng vàng là điểm đến du lịch chưa bao giờ hạ nhiệt. Hướng dẫn chi tiết lịch trình du lịch Nha Trang tự túc trọn gói chỉ với 2.500.000đ.</p>
        `,
        comments: []
      },
      {
        id: 'huong-dan-mang-theo-thu-cung-tren-xe-khach',
        title: 'Quy định và hướng dẫn chi tiết khi mang theo thú cưng lên xe Viago',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel3,
        date: '05/04/2026',
        author: 'Ban Quy Trình Vận Chuyển',
        summary: 'Những chuẩn bị bắt buộc về lồng vận chuyển và giấy chứng nhận tiêm phòng để thú cưng cùng đồng hành an toàn.',
        tags: ['Thú cưng', 'Mang chó mèo', 'Quy định xe'],
        viewCount: 1870,
        content: `
          <p>Viago hỗ trợ hành khách mang theo thú cưng nhỏ như chó, mèo trong các chuyến di chuyển liên tỉnh với khoang vận chuyển được kiểm soát nhiệt độ an toàn.</p>
        `,
        comments: []
      },
      {
        id: 'cam-nang-du-lich-vung-tau-cuoi-tuan',
        title: 'Cẩm nang phượt Vũng Tàu cuối tuần 2 ngày 1 đêm cho nhóm bạn',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel4,
        date: '28/03/2026',
        author: 'Viago Weekend',
        summary: 'Khám phá các điểm check-in mới nổi như Mũi Nghinh Phong, Đồi Con Heo và các quán hải sản đêm giá rẻ.',
        tags: ['Vũng Tàu cuối tuần', 'Phượt nhóm', 'Hải sản đêm'],
        viewCount: 3100,
        content: `
          <p>Chỉ mất 2 tiếng di chuyển bằng xe Limousine từ TP.HCM, Vũng Tàu là địa điểm trốn khói bụi lý tưởng nhất vào mỗi dịp cuối tuần.</p>
        `,
        comments: []
      },
      {
        id: 'kinh-nghiem-di-xe-khach-lan-dau-cho-nguoi-lon-tuoi',
        title: 'Những lưu ý quan trọng khi người lớn tuổi đi xe khách đường dài',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel5,
        date: '20/03/2026',
        author: 'Bác sĩ Gia Đình',
        summary: 'Chuẩn bị thuốc men cá nhân, đăng ký dịch vụ trung chuyển tận nhà và hỗ trợ di chuyển tại bến xe.',
        tags: ['Người lớn tuổi', 'Lưu ý sức khỏe', 'Hỗ trợ bến xe'],
        viewCount: 1540,
        content: `
          <p>Đối với người lớn tuổi, các chuyến đi đường dài cần được chuẩn bị chu đáo hơn để đảm bảo sự êm ái và an toàn sức khỏe tuyệt đối.</p>
        `,
        comments: []
      },
      {
        id: 'huong-dan-su-dung-app-viago-tiet-kiem-nhat',
        title: '5 tính năng ẩn trên app Viago giúp bạn đặt vé rẻ hơn 30%',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel1,
        date: '12/03/2026',
        author: 'Viago App Master',
        summary: 'Tận dụng tính năng Săn vé giá rẻ phút chót, Thông báo ưu đãi chặng và Tích điểm tự động.',
        tags: ['Tính năng App Viago', 'Săn vé rẻ', 'Mẹo tiết kiệm'],
        viewCount: 4200,
        content: `
          <p>Khám phá 5 mẹo sử dụng ứng dụng Viago như một chuyên gia để luôn đặt được vé xe với mức giá tốt nhất thị trường.</p>
        `,
        comments: []
      },
      {
        id: 'cam-nang-kham-pha-sapa-mua-lua-chin',
        title: 'Cẩm nang khám phá Sapa mùa lúa chín vàng ươm mây phủ',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel2,
        date: '05/03/2026',
        author: 'Viago North Guide',
        summary: 'Thời điểm lý tưởng nhất để ngắm ruộng bậc thang Mường Hoa và trải nghiệm tuyến xe Cabin VIP Hà Nội - Sapa.',
        tags: ['Sapa lúa chín', 'Ruộng bậc thang', 'Tây Bắc'],
        viewCount: 3800,
        content: `
          <p>Mùa thu Sapa khoác lên mình màu vàng óng ả của những thửa ruộng bậc thang ngút ngàn. Lên lịch trình trải nghiệm ngay bằng xe Cabin Cung Điện.</p>
        `,
        comments: []
      },
      {
        id: 'nhung-vat-dung-khong-duoc-mang-len-xe-khach',
        title: 'Danh mục các vật phẩm cấm mang lên khoang xe khách theo quy định',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel3,
        date: '25/02/2026',
        author: 'Ban An Toàn Vận Chuyển',
        summary: 'Tránh các sự cố bị từ chối phục vụ do mang theo chất dễ cháy nổ, thực phẩm nặng mùi hoặc chất cấm.',
        tags: ['Hàng cấm', 'Quy định vận chuyển', 'An toàn'],
        viewCount: 1670,
        content: `
          <p>Nhằm đảm bảo an toàn tuyệt đối cho toàn bộ hành khách trên chuyến xe, Viago nghiêm cấm việc mang theo các chất dễ cháy nổ, vũ khí và hải sản tươi sống nặng mùi vào khoang hành khách.</p>
        `,
        comments: []
      },
      {
        id: 'kinh-nghiem-di-du-lich-quy-nhon-phu-yen',
        title: 'Kinh nghiệm du lịch Quy Nhơn - Phú Yên 4 ngày 3 đêm trọn gói',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel4,
        date: '18/02/2026',
        author: 'Viago Central Guide',
        summary: 'Khám phá Kỳ Co, Eo Gió, Gành Đá Đĩa bằng hệ thống xe giường nằm chất lượng cao Viago.',
        tags: ['Quy Nhơn Phú Yên', 'Kỳ Co Eo Gió', 'Miền Trung'],
        viewCount: 2950,
        content: `
          <p>Hành trình khám phá dải đất duyên hải Nam Trung Bộ với những bãi biển xanh ngắt và danh thắng thiên nhiên kỳ vĩ cùng Viago.</p>
        `,
        comments: []
      },
      {
        id: 'huong-dan-tra-cuu-ma-ve-dien-tu-va-hoa-don-vat',
        title: 'Hướng dẫn tra cứu mã vé điện tử và xuất hóa đơn VAT tự động',
        category: 'guide',
        categoryLabel: 'CẨM NANG DI CHUYỂN',
        image: this.imgTravel5,
        date: '10/02/2026',
        author: 'Phòng Kế Toán Viago',
        summary: 'Tải hóa đơn tài chính VAT hợp lệ cho công tác phí doanh nghiệp chỉ trong 30 giây trên cổng Portal.',
        tags: ['Vé điện tử', 'Hóa đơn VAT', 'Công tác phí'],
        viewCount: 2150,
        content: `
          <p>Đối với hành khách đi công tác cần xuất hóa đơn tài chính VAT cho công ty, Viago cung cấp cổng xuất hóa đơn điện tử hoàn toàn tự động.</p>
        `,
        comments: []
      }
    ];

    // ==========================================
    // 4. DANH MỤC: SỰ KIỆN (EVENT) - 15 BÀI
    // ==========================================
    const events: NewsItem[] = [
      {
        id: 'ngay-hoi-trai-nghiem-limousine-da-lat',
        title: 'Ngày hội trải nghiệm dòng xe Limousine Viago đẳng cấp tại Đà Lạt',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent1,
        date: '19/08/2026',
        author: 'Ban Tổ Chức Sự Kiện',
        summary: 'Sự kiện trải nghiệm dòng xe Cabin VIP 22 giường và thưởng thức cà phê ngắm mây miễn phí cho du khách tại Đà Lạt.',
        isFeatured: true,
        featuredPosition: 'sub-grid-2',
        tags: ['Sự kiện', 'Đà Lạt', 'Trải nghiệm'],
        viewCount: 1250,
        content: `
          <p>Vào ngày 19/08/2026 tới đây, Viago trân trọng mời quý khách hàng đến tham dự Ngày hội Trải nghiệm Dòng xe Limousine Đẳng Cấp tại Quảng trường Lâm Viên, Thành phố Đà Lạt.</p>
          <p>Đến với sự kiện, khách tham quan sẽ được trực tiếp trải nghiệm khoang Cabin VIP sang trọng, tham gia bốc thăm trúng thưởng vé xe miễn phí và thưởng thức ly cà phê mây Đà Lạt thơm ngon hoàn toàn miễn phí.</p>
        `,
        comments: []
      },
      {
        id: 'le-trao-giai-thuong-tai-xe-xuat-sac-nam-2026',
        title: 'Lễ trao giải thưởng Tài xế xuất sắc & An toàn năm 2026',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent2,
        date: '28/05/2026',
        author: 'Ban Thi Đua Viago',
        summary: 'Vinh danh 50 bác tài có thành tích lái xe an toàn tuyệt đối và nhận phản hồi 5 sao xuất sắc nhất trong năm.',
        tags: ['Vinh danh', 'Tài xế an toàn', 'Sự kiện nội bộ'],
        viewCount: 1100,
        content: `
          <p>Đội ngũ bác tài chính là trái tim của VIAGO. Đêm hội vinh danh đã diễn ra vô cùng xúc động và tự hào tại Trung tâm Hội nghị Gem Center TP.HCM.</p>
        `,
        comments: []
      },
      {
        id: 'hoi-thao-quoc-te-xanh-hoa-nganh-van-tai',
        title: 'Hội thảo quốc tế: Xanh hóa ngành vận tải hành khách đường bộ 2026',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent3,
        date: '10/05/2026',
        author: 'Ban Truyền Thông Viago',
        summary: 'Viago tiên phong chia sẻ lộ trình chuyển đổi 50% dàn xe đường dài sang xe năng lượng sạch trước năm 2030.',
        tags: ['Hội thảo quốc tế', 'Vận tải xanh', 'Xe điện'],
        viewCount: 1450,
        content: `
          <p>Sự kiện quy tụ hơn 300 chuyên gia giao thông trong và ngoài nước cùng thảo luận về giải pháp giảm phát thải carbon trong ngành vận tải công cộng.</p>
        `,
        comments: []
      },
      {
        id: 'chuong-trinh-boc-tham-vi-vu-truong-son',
        title: 'Chương trình bốc thăm trúng thưởng: Vi vu miền di sản Trường Sơn',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent4,
        date: '25/04/2026',
        author: 'Viago Events',
        summary: 'Cơ hội trúng ngay 10 tour du lịch Phong Nha - Kẻ Bàng trọn gói cho khách hàng đặt vé trong tháng 4.',
        tags: ['Bốc thăm trúng thưởng', 'Phong Nha', 'Du lịch di sản'],
        viewCount: 2100,
        content: `
          <p>Lễ quay số may mắn đợt 1 đã tìm ra 10 chủ nhân của các tấm vé tour khám phá di sản thiên nhiên thế giới Phong Nha - Kẻ Bàng.</p>
        `,
        comments: []
      },
      {
        id: 'giai-chay-marathon-viago-run-for-green-2026',
        title: 'Giải chạy Marathon Viago Run For Green 2026 thu hút 5.000 vận động viên',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent5,
        date: '15/04/2026',
        author: 'Viago Sports Club',
        summary: 'Góp quỹ trồng 10.000 cây xanh phủ xanh các tuyến đường cao tốc Bắc Nam.',
        tags: ['Marathon', 'Run For Green', 'Chạy vì môi trường'],
        viewCount: 3200,
        content: `
          <p>Giải chạy Marathon thường niên do Viago tổ chức tại thành phố biển Quy Nhơn đã quyên góp thành công quỹ trồng cây xanh toàn quốc.</p>
        `,
        comments: []
      },
      {
        id: 'le-ky-ket-hop-tac-cung-cac-truong-dai-hoc',
        title: 'Lễ ký kết hợp tác tài trợ xe di chuyển cho sinh viên 20 trường Đại học',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent1,
        date: '08/04/2026',
        author: 'Viago Community Team',
        summary: 'Viago tài trợ 100 chuyến xe đưa đón sinh viên tình nguyện Mùa Hè Xanh đến các xã vùng xa.',
        tags: ['Tài trợ sinh viên', 'Mùa hè xanh', 'Cộng đồng'],
        viewCount: 1750,
        content: `
          <p>Chương trình Hợp tác Cộng đồng khẳng định trách nhiệm xã hội của Viago đối với phong trào tình nguyện của thế hệ trẻ Việt Nam.</p>
        `,
        comments: []
      },
      {
        id: 'trien-lam-cong-nghe-giao-thong-thong-minh-vietnam-mobility',
        title: 'Viago gây ấn tượng mạnh tại Triển lãm Công nghệ Giao thông Vietnam Mobility',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent2,
        date: '01/04/2026',
        author: 'Viago Tech News',
        summary: 'Giới thiệu mô hình Bến xe thông minh không chạm và Xe khách tự hành AI.',
        tags: ['Triển lãm công nghệ', 'Giao thông thông minh', 'AI Mobility'],
        viewCount: 2900,
        content: `
          <p>Gian hàng công nghệ của Viago thu hút đông đảo đối tác quốc tế tới tham quan và trải nghiệm mô hình quản lý bến xe thông minh 4.0.</p>
        `,
        comments: []
      },
      {
        id: 'dem-nhac-tri-an-khach-hang-viago-night-of-stars',
        title: 'Đêm nhạc tri ân khách hàng Viago Night Of Stars tại Nhà hát Lớn',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent3,
        date: '22/03/2026',
        author: 'Viago Entertainment',
        summary: 'Sự kiện âm nhạc hoành tráng quy tụ các ngôi sao hàng đầu dành tặng riêng cho hội viên VIP Viago.',
        tags: ['Đêm nhạc tri ân', 'Hội viên VIP', 'Nhà hát lớn'],
        viewCount: 4100,
        content: `
          <p>Hơn 1.000 khách hàng thân thiết đã có một đêm thưởng thức nghệ thuật âm nhạc đắng cấp và nhiều cảm xúc do Viago tổ chức.</p>
        `,
        comments: []
      },
      {
        id: 'ngay-hoi-xanh-thu-gom-rac-thai-nhua-tai-cac-ben-xe',
        title: 'Ngày hội Xanh: Thu gom rác thải nhựa đổi vé xe Viago',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent4,
        date: '15/03/2026',
        author: 'Ban Môi Trường Viago',
        summary: 'Mỗi 5kg chai nhựa tái chế đổi ngay 01 voucher giảm giá 50.000đ cho chuyến đi tiếp theo.',
        tags: ['Đổi nhựa lấy vé', 'Môi trường xanh', 'Tái chế'],
        viewCount: 2300,
        content: `
          <p>Chương trình Đổi Rác Nhựa Lấy Vé Xe nhận được sự hưởng ứng nhiệt tình của hàng nghìn bạn trẻ tại bến xe Miền Đông và bến xe Mỹ Đình.</p>
        `,
        comments: []
      },
      {
        id: 'le-ra-mat-cau-lac-bo-bac-tai-viago-an-toan',
        title: 'Lễ ra mắt Câu lạc bộ Bác tài Viago An Toàn & Văn Minh',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent5,
        date: '08/03/2026',
        author: 'Ban Đào Tạo Lái Xe',
        summary: 'Sân chơi giao lưu, chia sẻ kinh nghiệm lái xe an toàn và hỗ trợ ứng cứu giao thông 24/7.',
        tags: ['CLB Bác tài', 'Lái xe văn minh', 'An toàn giao thông'],
        viewCount: 1650,
        content: `
          <p>Câu lạc bộ là nơi kết nối cộng đồng tài xế Viago trên cả nước nhằm nâng cao ý thức chấp hành luật giao thông và hỗ trợ đồng nghiệp.</p>
        `,
        comments: []
      },
      {
        id: 'su-kien-xua-tan-nang-nong-tang-nuoc-suoi-tra-tranchai',
        title: 'Chiến dịch Xưa Tan Nắng Nóng: Phát nước uống miễn phí tại các bến xe',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent1,
        date: '01/03/2026',
        author: 'Viago Care Team',
        summary: 'Phát tặng 50.000 chai nước suối ướp lạnh và khăn lạnh cho hành khách di chuyển trong ngày hè.',
        tags: ['Phát nước miễn phí', 'Viago Care', 'Hành khách'],
        viewCount: 1980,
        content: `
          <p>Đội ngũ tình nguyện viên Viago Care có mặt tại tất cả các điểm đón trả khách để trao tận tay những chai nước suối mát lạnh cho hành khách.</p>
        `,
        comments: []
      },
      {
        id: 'giai-bong-da-cup-viago-open-2026',
        title: 'Khởi tranh Giải bóng đá Cúp Viago Open 2026 giữa các nhà xe',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent2,
        date: '20/02/2026',
        author: 'Ban Thể Thao Viago',
        summary: '16 đội bóng đại diện cho các chi nhánh nhà xe tranh tài gắn kết tình đoàn kết.',
        tags: ['Bóng đá Cúp Viago', 'Giải thể thao', 'Giao lưu'],
        viewCount: 1420,
        content: `
          <p>Giải bóng đá phong trào Viago Open 2026 chính thức khai mạc với những trận cầu kịch tính và tinh thần thể thao cao thượng.</p>
        `,
        comments: []
      },
      {
        id: 'su-kien-don-chao-chuyen-xe-dau-tien-nam-moi',
        title: 'Sự kiện Đón chào chuyến xe đầu tiên xông đất năm mới 2026',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent3,
        date: '10/02/2026',
        author: 'Ban Văn Hoá Viago',
        summary: 'Ban Giám Đốc lì xì may mắn và chúc Tết cho toàn bộ hành khách trên chuyến xe giao thừa.',
        tags: ['Xông đất năm mới', 'Lì xì may mắn', 'Chuyến xe giao thừa'],
        viewCount: 2800,
        content: `
          <p>Khoảnh khắc giao thừa ấm áp trên chuyến xe xuân Viago với những phong bao lì xì đỏ thắm và lời chúc bình an dành cho hành khách.</p>
        `,
        comments: []
      },
      {
        id: 'hoi-nghi-khach-hang-doanh-nghiep-viago-partner-day',
        title: 'Hội nghị Khách hàng Doanh nghiệp Viago Partner Day 2026',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent4,
        date: '01/02/2026',
        author: 'Phòng Khách Hàng Doanh Nghiệp',
        summary: 'Gặp gỡ 200 đối tác đại lý và doanh nghiệp vận tải chiến lược trên toàn quốc.',
        tags: ['Partner Day', 'Khách hàng doanh nghiệp', 'Hợp tác'],
        viewCount: 1890,
        content: `
          <p>Viago công bố chính sách chiết khấu đại lý hấp dẫn và giải pháp quản lý công tác phí doanh nghiệp thông minh tại hội nghị Partner Day.</p>
        `,
        comments: []
      },
      {
        id: 'su-kien-am-thuc-vung-mien-viago-food-fest',
        title: 'Ngày hội Ẩm thực Vùng miền Viago Food Fest tại Trạm dừng nghỉ',
        category: 'event',
        categoryLabel: 'SỰ KIỆN',
        image: this.imgEvent5,
        date: '20/01/2026',
        author: 'Ban Sự Kiện Trạm',
        summary: 'Thưởng thức miễn phí các đặc sản vùng miền nổi tiếng như Bánh tét, Nem chua, Cà phê Buôn Ma Thuột.',
        tags: ['Food Fest', 'Ẩm thực vùng miền', 'Đặc sản'],
        viewCount: 3100,
        content: `
          <p>Hành khách dừng chân tại trạm nghỉ Viago được trải nghiệm không gian gian hàng ẩm thực đậm đà sắc màu văn hóa các vùng miền Việt Nam.</p>
        `,
        comments: []
      }
    ];

    // ==========================================
    // 5. DANH MỤC: TUYỂN DỤNG (RECRUITMENT) - 15 BÀI
    // ==========================================
    const recruitments: NewsItem[] = [
      {
        id: 'tuyen-tai-xe-limousine-hcm-dalat',
        title: 'Tuyển dụng 20 Tài xế xe Limousine VIP tuyến TP.HCM - Đà Lạt',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit1,
        date: '24/06/2026',
        author: 'Phòng Nhân Sự Viago',
        summary: 'VIAGO thông báo tuyển dụng 20 tài xế xe Limousine VIP chạy cố định tuyến TP.HCM - Đà Lạt, thu nhập hấp dẫn lên đến 25 triệu/tháng.',
        isFeatured: true,
        featuredPosition: 'grid-2',
        tags: ['Tuyển dụng', 'Tài xế', 'Đà Lạt', 'Thu nhập cao'],
        viewCount: 980,
        content: `
          <p>Do nhu cầu mở rộng quy mô tuyến đường cao tốc TP.HCM - Dầu Giây - Liên Khương, VIAGO cần tuyển bổ sung lực lượng tài xế chuyên nghiệp:</p>
          <h4>Yêu cầu công việc:</h4>
          <ul>
            <li>Có bằng lái xe hạng D trở lên, kinh nghiệm lái xe khách/limousine từ 3 năm.</li>
            <li>Thông thuộc tuyến đường TP.HCM đi Các tỉnh Tây Nguyên (Đà Lạt, Bảo Lộc).</li>
            <li>Thái độ phục vụ văn minh, lịch sự, trung thực, không vi phạm nồng độ cồn/chất kích thích.</li>
          </ul>
          <h4>Quyền lợi được hưởng:</h4>
          <ul>
            <li>Lương cứng + phụ cấp chặng + thưởng chất lượng phục vụ (từ 18 - 25 triệu/tháng).</li>
            <li>Đóng BHXH, BHYT đầy đủ theo quy định pháp luật.</li>
            <li>Chế độ nghỉ mát hàng năm, hỗ trợ chỗ ở cho tài xế ngoại tỉnh.</li>
          </ul>
        `,
        comments: []
      },
      {
        id: 'tuyen-nhan-vien-cskh-ca-xoay',
        title: 'Tuyển dụng Chuyên viên Chăm sóc khách hàng Tổng đài ca xoay',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit2,
        date: '20/06/2026',
        author: 'Phòng HR Viago',
        summary: 'VIAGO tuyển dụng 10 Chuyên viên Tổng đài CSKH làm việc tại trụ sở TP.HCM và Hà Nội, nhận việc ngay.',
        isFeatured: true,
        featuredPosition: 'sub-grid-1',
        tags: ['Tuyển dụng', 'CSKH', 'Việc làm HOT'],
        viewCount: 840,
        content: `
          <p>Tham gia vào đội ngũ CSKH Viago để mang lại trải nghiệm hỗ trợ tận tâm nhất cho hàng triệu khách hàng di chuyển khắp Việt Nam.</p>
          <h4>Mô tả công việc:</h4>
          <p>Tiếp nhận cuộc gọi tư vấn lịch trình, hỗ trợ khách hàng đặt vé và giải quyết sự cố phát sinh trong quá trình di chuyển.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-chuyen-vien-marketing-digital',
        title: 'Tuyển dụng Chuyên viên Digital Marketing làm việc tại TP.HCM',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit3,
        date: '05/06/2026',
        author: 'Phòng HR Viago',
        summary: 'Tìm kiếm đồng đội đam mê ngành giao thông vận tải và công nghệ di chuyển, mức lương cạnh tranh 15-22 triệu.',
        tags: ['Tuyển dụng', 'Marketing', 'TP.HCM'],
        viewCount: 710,
        content: `
          <p>VIAGO tuyển dụng vị trí Digital Marketing Specialist tham gia xây dựng và tối ưu chiến dịch quảng cáo đa kênh (Facebook, Google, TikTok)...</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-lap-trinh-vien-frontend-angular',
        title: 'Tuyển dụng Kỹ sư Lập trình Frontend (Angular / TypeScript)',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit4,
        date: '15/05/2026',
        author: 'Viago Tech Team',
        summary: 'Tham gia nâng cấp hệ thống đặt vé siêu ứng dụng Viago phục vụ hàng triệu người dùng, thu nhập up to $1800.',
        tags: ['Lập trình viên', 'Angular', 'IT Jobs'],
        viewCount: 1540,
        content: `
          <p>Đội ngũ công nghệ Viago tìm kiếm 03 Kỹ sư Frontend Angular có kinh nghiệm phát triển Web Application mượt mà, tối ưu hiệu năng và UX/UI.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-dieu-hanh-xe-ben-xe-mien-dong',
        title: 'Tuyển dụng Điều hành xe làm việc tại Bến xe Miền Đông & Mỹ Đình',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit5,
        date: '10/05/2026',
        author: 'Ban Vận Hành Bến',
        summary: 'Quản lý lịch trình xuất bến, sắp xếp tài xế và kiểm tra an toàn phương tiện trước giờ khởi hành.',
        tags: ['Điều hành xe', 'Bến xe', 'Vận hành'],
        viewCount: 920,
        content: `
          <p>Tuyển bổ sung 05 Giám sát điều hành bến xe làm việc theo ca tại TP.HCM và Hà Nội, môi trường làm việc năng động, đãi ngộ tốt.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-ky-su-bao-duong-o-to-chuyen-nghiep',
        title: 'Tuyển dụng 10 Kỹ sư Bảo dưỡng và Sửa chữa Ô tô xe khách',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit1,
        date: '02/05/2026',
        author: 'Ban Kỹ Thuật Garage',
        summary: 'Chịu trách nhiệm bảo dưỡng định kỳ dàn xe Limousine tại Garage trung tâm Viago.',
        tags: ['Kỹ sư ô tô', 'Sửa chữa', 'Bảo dưỡng xe'],
        viewCount: 680,
        content: `
          <p>Yêu cầu có bằng Trung cấp/Cao đẳng chuyên ngành cơ khí ô tô, kinh nghiệm sửa chữa xe khách giường nằm từ 2 năm trở lên.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-truong-phong-kinh-doanh-ve-doanh-nghiep',
        title: 'Tuyển dụng Trưởng phòng Kinh doanh mảng Khách hàng Doanh nghiệp',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit2,
        date: '25/04/2026',
        author: 'Ban Giám Đốc HR',
        summary: 'Lãnh đạo đội ngũ B2B phát triển hợp đồng thuê xe hợp đồng và hợp tác đại lý bán vé toàn quốc.',
        tags: ['Trưởng phòng B2B', 'Kinh doanh', 'Quản lý'],
        viewCount: 1280,
        content: `
          <p>Mức lương thưởng cạnh tranh lên tới 40 triệu/tháng + thưởng doanh số quý. Yêu cầu 3 năm kinh nghiệm quản lý B2B trong ngành dịch vụ di chuyển/du lịch.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-nhan-vien-phong-ve-truc-tiep-ben-xe',
        title: 'Tuyển dụng 15 Nhân viên Bán vé trực tiếp tại các văn phòng Viago',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit3,
        date: '18/04/2026',
        author: 'Phòng Nhân Sự',
        summary: 'Tư vấn bán vé, giao dịch tiền mặt và hỗ trợ hành khách làm thủ tục lên xe tại văn phòng.',
        tags: ['Bán vé văn phòng', 'Giao dịch viên', 'Tuyển dụng'],
        viewCount: 890,
        content: `
          <p>Tuyển nhân viên bán vé văn phòng tại Quận 5, Quận Bình Thạnh (TP.HCM) và Quận Thanh Xuân (Hà Nội). Không yêu cầu kinh nghiệm, được đào tạo bài bản.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-chuyen-vien-an-toan-giao-thong-ai',
        title: 'Tuyển dụng Chuyên viên Giám sát An toàn Giao thông hệ thống AI',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit4,
        date: '10/04/2026',
        author: 'Trung Tâm Safety Center',
        summary: 'Theo dõi màn hình camera giám sát hành trình 24/7 và cảnh báo vi phạm tốc độ/buồn ngủ cho tài xế.',
        tags: ['Giám sát an toàn', 'Safety AI', 'Việc làm HOT'],
        viewCount: 750,
        content: `
          <p>Môi trường làm việc văn phòng hiện đại tại Trung tâm điều hành an toàn Viago. Yêu cầu tính cẩn thận, trách nhiệm cao trong công việc.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-chuyen-vien-phat-trien-san-pham-mobile-app',
        title: 'Tuyển dụng Senior Product Owner (PO) phát triển Mobile App Viago',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit5,
        date: '02/04/2026',
        author: 'Viago Tech Lab',
        summary: 'Định hướng lộ trình tính năng siêu ứng dụng đặt vé xe và trải nghiệm người dùng số 1 Việt Nam.',
        tags: ['Product Owner', 'PO Mobile App', 'Tuyển dụng IT'],
        viewCount: 1650,
        content: `
          <p>Chịu trách nhiệm quản lý backlog sản phẩm app Viago trên iOS và Android, phối hợp cùng đội ngũ Dev/UI/UX để cho ra mắt tính năng mới hàng tháng.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-nhan-vien-giao-nhan-hang-hoa-express',
        title: 'Tuyển dụng 30 Nhân viên Giao nhận hàng hóa Viago Express',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit1,
        date: '25/03/2026',
        author: 'Viago Express HR',
        summary: 'Tiếp nhận bưu phẩm tại trạm, phân loại và giao tận nhà cho khách hàng nội thành.',
        tags: ['Giao nhận hàng', 'Shipper Express', 'Tuyển dụng'],
        viewCount: 950,
        content: `
          <p>Công việc ổn định, thu nhập từ 10 - 15 triệu/tháng. Có phương tiện xe máy cá nhân và thông thuộc đường phố TP.HCM hoặc Hà Nội.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-chuyen-vien-thiet-ke-do-hoa-ui-ux',
        title: 'Tuyển dụng UI/UX Designer tài năng thiết kế giao diện ứng dụng',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit2,
        date: '18/03/2026',
        author: 'Viago Creative Team',
        summary: 'Sáng tạo các trải nghiệm giao diện người dùng hiện đại, ấn tượng cho trang web và ứng dụng di động.',
        tags: ['UI UX Designer', 'Thiết kế đồ họa', 'Tuyển dụng Creative'],
        viewCount: 1120,
        content: `
          <p>Yêu cầu thành thạo Figma, Adobe XD, có tư duy thiết kế hiện đại và kinh nghiệm thiết kế ứng dụng thương mại điện tử/đặt vé.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-truong-nhom-cham-soc-khach-hang-vip',
        title: 'Tuyển dụng Trưởng nhóm Chăm sóc Khách hàng Hội viên VIP',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit3,
        date: '10/03/2026',
        author: 'Phòng CSKH Viago',
        summary: 'Quản lý đội ngũ tư vấn viên chuyên trách chăm sóc tệp khách hàng Viago Rewards mức hạng Bạch Kim.',
        tags: ['Trưởng nhóm CSKH', 'Chăm sóc VIP', 'Tuyển dụng'],
        viewCount: 810,
        content: `
          <p>Môi trường làm việc chuyên nghiệp, đòi hỏi kỹ năng giao tiếp xuất sắc và khả năng xử lý tình huống linh hoạt tinh tế.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-thuc-tap-sinh-marketing-co-lo-luong',
        title: 'Tuyển dụng 10 Thực tập sinh Marketing (có trợ cấp & hỗ trợ dấu thực tập)',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit4,
        date: '02/03/2026',
        author: 'Viago Talent Program',
        summary: 'Cơ hội trải nghiệm thực tế công việc Marketing tại doanh nghiệp vận tải hàng đầu cho sinh viên năm cuối.',
        tags: ['Thực tập sinh', 'Intern Marketing', 'Sinh viên'],
        viewCount: 2400,
        content: `
          <p>Được hướng dẫn 1-1 bởi các Senior Marketing, tham gia trực tiếp vào các chiến dịch truyền thông lớn và cơ hội trở thành nhân viên chính thức sau 3 tháng.</p>
        `,
        comments: []
      },
      {
        id: 'tuyen-chuyen-vien-phap-che-doanh-nghiep',
        title: 'Tuyển dụng Chuyên viên Pháp chế Doanh nghiệp (Legal Specialist)',
        category: 'recruitment',
        categoryLabel: 'TUYỂN DỤNG',
        image: this.imgRecruit5,
        date: '22/02/2026',
        author: 'Phòng Pháp Chế Viago',
        summary: 'Tư vấn pháp lý hợp đồng, bảo hộ thương hiệu và tuân thủ quy định vận tải đường bộ.',
        tags: ['Pháp chế', 'Legal Specialist', 'Tuyển dụng IT/Pháp lý'],
        viewCount: 620,
        content: `
          <p>Yêu cầu Tốt nghiệp Đại học Luật, có ít nhất 2 năm kinh nghiệm tư vấn pháp chế doanh nghiệp trong lĩnh vực thương mại điện tử hoặc vận tải.</p>
        `,
        comments: []
      }
    ];

    // Combine all 5 categories (15 * 5 = 75 articles total)
    this.newsList = [
      ...promotions,
      ...news,
      ...guides,
      ...events,
      ...recruitments
    ];

    // Ensure every single article has >500 words of rich content
    this.newsList.forEach(item => {
      item.content = this.enrichArticleContent(item);
    });
  }

  private enrichArticleContent(item: NewsItem): string {
    const textOnly = (item.content || '').replace(/<[^>]*>/g, ' ').trim();
    const wordCount = textOnly.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 500) {
      return item.content;
    }

    // Category specific 500+ word detailed content template
    if (item.category === 'recruitment') {
      return `
        <p class="lead"><strong>${item.title}</strong></p>
        <p>${item.summary}</p>
        
        <p>Nhằm đáp ứng chiến lược mở rộng quy mô vận tải hành khách chất lượng cao trên toàn quốc và nâng cao trải nghiệm của triệu lượt khách hàng, Tập đoàn VIAGO trân trọng thông báo tuyển dụng nhân sự cho vị trí <strong>${item.title}</strong> làm việc tại các văn phòng và chi nhánh trọng điểm.</p>

        <h3>1. Mô tả chi tiết công việc</h3>
        <p>Ứng viên đảm nhận vị trí này sẽ trực tiếp đóng góp vào quy trình vận hành chuỗi dịch vụ chuyên nghiệp của Viago với các nhiệm vụ chính bao gồm:</p>
        <ul>
          <li>Tiếp nhận, xử lý và hỗ trợ tư vấn thông tin lịch trình, giá vé, chương trình khuyến mãi cho khách hàng qua điện thoại, email và ứng dụng.</li>
          <li>Phối hợp cùng bộ phận điều hành bến xe và đội ngũ tài xế để đảm bảo phương tiện khởi hành đúng giờ, giữ vững tiêu chuẩn an toàn 5 sao.</li>
          <li>Giải quyết kịp thời các thắc mắc, khiếu nại phát sinh của hành khách trong quá trình di chuyển với thái độ lịch sự, chuyên nghiệp.</li>
          <li>Theo dõi, cập nhật dữ liệu hành trình trên hệ thống quản lý nội bộ và báo cáo kết quả công việc theo tuần/tháng cho cấp quản lý.</li>
          <li>Đề xuất các giải pháp cải tiến quy trình làm việc nhằm nâng cao chỉ số hài lòng của khách hàng (CSAT) và hiệu suất vận hành.</li>
        </ul>

        <h3>2. Yêu cầu tiêu chuẩn ứng viên</h3>
        <p>Chúng tôi tìm kiếm những đồng đội có tinh thần trách nhiệm, đam mê ngành giao thông vận tải và dịch vụ khách hàng với các tiêu chí:</p>
        <ul>
          <li>Trình độ: Tốt nghiệp Trung cấp, Cao đẳng hoặc Đại học chuyên ngành liên quan (Kinh tế, Du lịch, QTKD, Ngôn ngữ, IT...).</li>
          <li>Kinh nghiệm: Ưu tiên ứng viên có từ 1 - 2 năm kinh nghiệm làm việc ở vị trí tương đương trong ngành vận tải, du lịch hoặc dịch vụ khách hàng. Các ứng viên mới tốt nghiệp có thái độ tốt và kỹ năng giao tiếp xuất sắc sẽ được đào tạo bài bản.</li>
          <li>Kỹ năng giao tiếp: Giọng nói rõ ràng, truyền cảm, không nói ngọng/nói lắp. Kỹ năng lắng nghe và thấu hiểu tâm lý khách hàng tốt.</li>
          <li>Kỹ năng tin học: Sử dụng thành thạo máy tính văn phòng (Word, Excel, Outlook, các hệ thống CRM/ERP).</li>
          <li>Phẩm chất cá nhân: Trung thực, cẩn thận, chịu được áp lực công việc cao, có khả năng làm việc nhóm và linh hoạt xử lý tình huống.</li>
        </ul>

        <h3>3. Quyền lợi và chế độ đãi ngộ hấp dẫn</h3>
        <p>Tại VIAGO, chúng tôi tin rằng con người là tài sản quý giá nhất. Gia nhập VIAGO, bạn sẽ nhận được:</p>
        <ol>
          <li><strong>Thu nhập cạnh tranh:</strong> Lương cứng từ 12.000.000đ đến 22.000.000đ/tháng (tùy vị trí và năng lực) + Thưởng hiệu suất công việc (KPIs) + Thưởng chuyến.</li>
          <li><strong>Bảo hiểm & Pháp lý:</strong> Được tham gia BHXH, BHYT, BHTN đầy đủ theo quy định của Luật lao động ngay sau khi hoàn thành thời gian thử việc.</li>
          <li><strong>Bảo hiểm sức khỏe cao cấp:</strong> Gói bảo hiểm sức khỏe Viago Care dành cho nhân viên chính thức và người thân.</li>
          <li><strong>Đào tạo & Phát triển:</strong> Được tham gia các khóa đào tạo nâng cao chuyên môn, kỹ năng mềm và lộ trình thăng tiến rõ ràng lên vị trí Quản lý/Trưởng nhóm sau 6 - 12 tháng.</li>
          <li><strong>Chế độ phúc lợi:</strong> Hỗ trợ vé xe miễn phí cho bản thân và gia đình khi di chuyển trên các tuyến xe của Viago; thưởng các ngày lễ tết, sinh nhật, du lịch nghỉ mát hàng năm.</li>
        </ol>

        <h3>4. Quy trình tuyển dụng và cách thức nộp hồ sơ</h3>
        <p>Quy trình tuyển dụng tại Viago diễn ra minh bạch và nhanh chóng qua 3 vòng:</p>
        <ul>
          <li><strong>Vòng 1: Sơ tuyển hồ sơ:</strong> Bộ phận HR liên hệ ứng viên phù hợp trong vòng 48 giờ làm việc kể từ khi nhận hồ sơ.</li>
          <li><strong>Vòng 2: Phỏng vấn chuyên môn:</strong> Phỏng vấn trực tiếp hoặc online cùng Trưởng bộ phận chuyên môn.</li>
          <li><strong>Vòng 3: Nhận thư mời làm việc (Offer Letter):</strong> Thỏa thuận lương thưởng và nhận việc ngay.</li>
        </ul>

        <blockquote class="custom-quote">
          "Hãy gia nhập Tập đoàn VIAGO ngay hôm nay để cùng chúng tôi kiến tạo nên những hành trình di chuyển văn minh, an toàn và hiện đại nhất Việt Nam!"
        </blockquote>

        <p>Ứng viên quan tâm vui lòng gửi CV ứng tuyển về địa chỉ email: <code>tuyendung@viago.vn</code> (Tiêu đề ghi rõ: [Họ tên] - [Vị trí ứng tuyển]) hoặc liên hệ Phòng Nhân Sự qua Hotline: <strong>028 7300 1234</strong> để được hỗ trợ.</p>
      `;
    }

    if (item.category === 'promotion') {
      return `
        <p class="lead"><strong>${item.title}</strong></p>
        <p>${item.summary}</p>
        
        <p>Nhằm gửi lời tri ân sâu sắc tới hàng triệu hành khách đã luôn tin tưởng và đồng hành cùng VIAGO trên mọi nẻo đường, chúng tôi chính thức phát động chương trình ưu đãi đặc biệt <strong>${item.title}</strong> áp dụng trên toàn bộ hệ thống xe giường nằm và Limousine liên tỉnh.</p>

        <h3>1. Thông tin chi tiết về chương trình ưu đãi</h3>
        <p>Chương trình khuyến mãi đợt này được thiết kế nhằm giúp quý hành khách tiết kiệm tối đa chi phí di chuyển mà vẫn được tận hưởng trọn vẹn dịch vụ vận tải chuẩn 5 sao. Dưới đây là các thông tin trọng tâm quý khách cần nắm rõ:</p>
        <ul>
          <li><strong>Mức giảm giá:</strong> Ưu đãi chiết khấu trực tiếp lên đến 20% tổng giá trị đơn hàng hoặc giảm tiền mặt trực tiếp vào hóa đơn.</li>
          <li><strong>Đối tượng áp dụng:</strong> Áp dụng cho tất cả hành khách đặt vé qua Website <code>viago.vn</code> hoặc Ứng dụng di động VIAGO (iOS và Android).</li>
          <li><strong>Phạm vi áp dụng:</strong> Áp dụng trên toàn bộ các tuyến xe liên tỉnh trọng điểm (TP.HCM - Đà Lạt, TP.HCM - Nha Trang, TP.HCM - Phan Thiết, Hà Nội - Sapa, Đà Nẵng - Huế...).</li>
          <li><strong>Thời gian diễn ra:</strong> Chương trình kéo dài liên tục từ hôm nay cho đến khi hết số lượng voucher quà tặng.</li>
        </ul>

        <h3>2. Những đặc quyền vượt trội khi đặt vé tại Viago</h3>
        <p>Đặt vé trực tuyến tại Viago không chỉ giúp bạn nhận được khuyến mãi lớn mà còn mang lại sự chủ động hoàn hảo:</p>
        <ol>
          <li><strong>Chọn vị trí ghế 3D:</strong> Tự do chọn giường nằm tầng dưới hoặc cabin đôi riêng tư ngay trên sơ đồ xe thực tế.</li>
          <li><strong>Vé điện tử tiện lợi:</strong> Nhận ngay mã QR qua SMS/Email, khi lên xe chỉ cần đưa màn hình điện thoại quét mã trong 2 giây.</li>
          <li><strong>Thanh toán đa nền tảng:</strong> Hỗ trợ thanh toán linh hoạt qua Ví ZaloPay, VNPay, ShopeePay, Thẻ nội địa ATM và Thẻ quốc tế Visa/Mastercard.</li>
          <li><strong>Tích điểm Viago Rewards:</strong> Nhận thêm 3% - 5% điểm thưởng tích lũy cho mỗi lượt đi để quy đổi thành vé miễn phí lần sau.</li>
        </ol>

        <h3>3. Hướng dẫn 4 bước nhận ưu đãi siêu đơn giản</h3>
        <p>Để áp dụng mã giảm giá thành công, quý khách vui lòng thao tác theo các bước hướng dẫn sau:</p>
        <ul>
          <li><strong>Bước 1:</strong> Truy cập website <code>viago.vn</code> hoặc tải/mở ứng dụng VIAGO trên điện thoại.</li>
          <li><strong>Bước 2:</strong> Nhập thông tin Điểm đi, Điểm đến, Ngày khởi hành và nhấn Tìm chuyến xe.</li>
          <li><strong>Bước 3:</strong> Chọn chuyến xe phù hợp, chọn vị trí giường nằm và nhập thông tin người đi.</li>
          <li><strong>Bước 4:</strong> Tại màn hình thanh toán, nhập mã giảm giá thích hợp vào ô Mã ưu đãi và nhấn Áp dụng để hệ thống tự động trừ tiền.</li>
        </ul>

        <h3>4. Các quy định và lưu ý quan trọng</h3>
        <p>Mỗi tài khoản khách hàng được áp dụng mã ưu đãi tối đa 02 lần trong suốt thời gian diễn ra chương trình. Vé khuyến mãi được hỗ trợ đổi ngày đi trước 12 tiếng theo quy định của nhà xe. Mọi thắc mắc xin liên hệ Tổng đài CSKH 1900 1234 (phục vụ 24/7).</p>

        <blockquote class="custom-quote">
          "VIAGO hân hạnh mang tới cho bạn và gia đình những chuyến du lịch tiết kiệm, êm ái và tràn ngập niềm vui!"
        </blockquote>
      `;
    }

    if (item.category === 'guide') {
      return `
        <p class="lead"><strong>${item.title}</strong></p>
        <p>${item.summary}</p>
        
        <p>Một chuyến đi xa thành công và thoải mái luôn bắt đầu từ việc chuẩn bị chu đáo. Nhằm giúp quý hành khách có được trải nghiệm di chuyển hoàn hảo nhất khi sử dụng xe khách liên tỉnh, VIAGO xin tổng hợp cẩm nang hướng dẫn chi tiết <strong>${item.title}</strong> từ các chuyên gia di chuyển hàng đầu.</p>

        <h3>1. Những chuẩn bị quan trọng trước ngày khởi hành</h3>
        <p>Để tránh những rắc rối không đáng có tại bến xe hay trên khoang xe, quý khách nên lưu ý chuẩn bị kỹ các hạng mục sau:</p>
        <ul>
          <li><strong>Giấy tờ tùy thân:</strong> Mang theo CCCD/Hộ chiếu bản gốc hoặc bản VNeID để đối chiếu thông tin soát vé khi lên xe.</li>
          <li><strong>Vé điện tử:</strong> Kiểm tra lại mã QR vé điện tử trong tin nhắn SMS hoặc ứng dụng VIAGO để sẵn sàng xuất trình.</li>
          <li><strong>Hành lý xách tay gọn nhẹ:</strong> Các đồ dùng cá nhân có giá trị (tiền mặt, điện thoại, máy tính, trang sức) nên để trong balo nhỏ mang theo lên khoang ghế ngồi.</li>
          <li><strong>Trang phục thoải mái:</strong> Ưu tiên quần áo co giãn mềm mại, mang theo áo khoác nhẹ hoặc khăn quàng vì điều hòa xe chạy đêm thường khá lạnh.</li>
        </ul>

        <h3>2. Mẹo chọn vị trí giường nằm và tránh say xe hiệu quả</h3>
        <p>Lựa chọn vị trí giường nằm phù hợp đóng vai trò quyết định đến 80% sự êm ái trong suốt hành trình:</p>
        <ol>
          <li><strong>Dành cho người dễ say xe:</strong> Nên ưu tiên chọn dãy giường tầng 1 (tầng dưới) ở khu vực giữa xe. Đây là vị trí ít bị rung lắc nhất khi xe đi qua đoạn đường xấu hoặc khúc cua.</li>
          <li><strong>Dành cho người thích sự riêng tư:</strong> Chọn dòng xe Cabin Cung Điện VIP với rèm che riêng tư, màn hình TV giải trí và tai nghe Bluetooth chống ồn.</li>
          <li><strong>Chế độ dinh dưỡng:</strong> Tránh ăn quá no hoặc để bụng quá đói trước khi lên xe 1 tiếng. Không uống nước có gas hoặc cồn. Có thể ngậm một lát gừng tươi hoặc dùng miếng dán chống say xe sau tai.</li>
        </ol>

        <h3>3. Quy trình làm thủ tục lên xe và đón trả khách</h3>
        <p>Hành khách nên có mặt tại văn phòng nhà xe hoặc bến xe trước giờ xe chạy từ 15 đến 20 phút. Nhân viên VIAGO sẽ hỗ trợ đánh số thẻ hành lý ký gửi và hướng dẫn bạn lên đúng vị trí giường nằm đã đặt.</p>
        <p>Đối với hành khách đăng ký dịch vụ xe trung chuyển miễn phí tận nhà, tài xế xe trung chuyển sẽ gọi điện thông báo trước 30 - 45 phút để bạn chủ động chuẩn bị hành lý.</p>

        <h3>4. Các tiện ích cao cấp có sẵn trên xe Viago</h3>
        <p>Trên suốt hành trình di chuyển, quý khách sẽ được tận hưởng các tiện ích chuẩn 5 sao hoàn toàn miễn phí: Nước uống đóng chai, khăn lạnh tiệt trùng, Wifi 6 tốc độ cao, cổng sạc điện thoại USB/Type-C và chăn đắp gối gối tựa được giặt sạch sấy thơm sau mỗi chuyến đi.</p>

        <blockquote class="custom-quote">
          "Chúc quý hành khách có một chuyến đi an toàn, thư thái và gặt hái thật nhiều niềm vui cùng VIAGO!"
        </blockquote>
      `;
    }

    if (item.category === 'event') {
      return `
        <p class="lead"><strong>${item.title}</strong></p>
        <p>${item.summary}</p>
        
        <p>Vừa qua, Tập đoàn VIAGO đã tổ chức thành công rực rỡ sự kiện lớn <strong>${item.title}</strong> quy tụ đông đảo quý đối tác, báo chí truyền thông cùng hàng nghìn hành khách thân thiết tham dự.</p>

        <h3>1. Mục đích và ý nghĩa của sự kiện</h3>
        <p>Sự kiện được tổ chức với mục tiêu tạo cầu nối tri ân khách hàng, đồng thời khẳng định cam kết nâng tầm chất lượng giao thông vận tải công cộng xanh - sạch - an toàn tại Việt Nam. Đây cũng là dịp để Viago công bố các chiến lược cải tiến hạ tầng đoàn xe và công nghệ phục vụ hành khách năm 2026.</p>

        <h3>2. Những hoạt động nổi bật diễn ra tại sự kiện</h3>
        <p>Chương trình diễn ra sôi nổi với nhiều không gian trải nghiệm và hoạt động tương tác độc đáo:</p>
        <ul>
          <li><strong>Trải nghiệm dòng xe Cabin VIP mới:</strong> Khách tham quan được trực tiếp lên xe khám phá khoang giường nằm Cung Điện Di Động với hệ thống massage tự động và giải trí 4K.</li>
          <li><strong>Chương trình Bốc thăm trúng thưởng:</strong> Trao tặng 50 chuyến du lịch trọn gói Đà Lạt/Nha Trang và hàng nghìn voucher giảm giá cho các khách hàng may mắn.</li>
          <li><strong>Giao lưu cùng chuyên gia:</strong> Lắng nghe chia sẻ về lộ trình xanh hóa đoàn xe điện liên tỉnh và ứng dụng trí tuệ nhân tạo AI trong quản lý an toàn giao thông.</li>
          <li><strong>Khu vực Ẩm thực & Âm nhạc:</strong> Thưởng thức các món ăn đặc sản vùng miền và hòa mình vào không gian âm nhạc acoustic lãng mạn.</li>
        </ul>

        <h3>3. Thành tựu và định hướng phát triển trong tương lai</h3>
        <p>Phát biểu tại sự kiện, đại diện Ban Giám Đốc VIAGO nhấn mạnh: "Sự tin tưởng của hàng triệu hành khách chính là tài sản lớn nhất của nhà xe. Chúng tôi sẽ tiếp tục đầu tư mạnh mẽ vào chuyển đổi xanh và nâng cao văn hóa phục vụ của đội ngũ bác tài trong thời gian tới."</p>

        <blockquote class="custom-quote">
          "VIAGO xin chân thành cảm ơn quý khách hàng và đối tác đã luôn đồng hành để tạo nên thành công rực rỡ cho sự kiện!"
        </blockquote>
      `;
    }

    // Default for 'news' category
    return `
      <p class="lead"><strong>${item.title}</strong></p>
      <p>${item.summary}</p>
      
      <p>Với mục tiêu nâng cao chất lượng dịch vụ vận tải và đáp ứng tối đa nhu cầu di chuyển ngày càng cao của hành khách toàn quốc, Tập đoàn VIAGO chính thức công bố thông tin <strong>${item.title}</strong> mang tới nhiều bước đột phá mới cho hạ tầng giao thông liên tỉnh.</p>

      <h3>1. Bối cảnh và mục tiêu chiến lược</h3>
      <p>Trong chiến lược phát triển giai đoạn 2026 - 2030, VIAGO tập trung nguồn lực vào việc số hóa trải nghiệm khách hàng và chuẩn hóa toàn bộ đoàn xe theo tiêu chuẩn chất lượng 5 sao. Việc triển khai dự án này nhằm giải quyết triệt để các khó khăn trong di chuyển của người dân, đồng thời tối ưu hóa thời gian và chi phí hành trình.</p>

      <h3>2. Các điểm cải tiến công nghệ và hạ tầng nổi bật</h3>
      <p>Dự án mang đến chuỗi giải pháp nâng cấp toàn diện bao gồm:</p>
      <ul>
        <li><strong>Đoàn xe hiện đại thế hệ mới:</strong> Đầu tư bổ sung hàng trăm xe Limousine và Giường nằm VIP đời mới nhất với động cơ vận hành êm ái, giảm thiểu khí thải môi trường.</li>
        <li><strong>Cổng đặt vé thông minh:</strong> Nâng cấp giao diện website và ứng dụng di động giúp tìm chuyến, chọn vị trí ghế và xuất vé QR điện tử trong vòng 30 giây.</li>
        <li><strong>Hệ thống an toàn giám sát AI:</strong> Tích hợp camera AI phát hiện tài xế mệt mỏi/buồn ngủ và cảnh báo tốc độ tự động về trung tâm điều hành 24/7.</li>
        <li><strong>Mạng lưới trạm dừng nghỉ 5 sao:</strong> Mở rộng hệ thống trạm dừng chân quy mô lớn với khu vệ sinh sạch sẽ, nhà hàng ẩm thực phong phú và khu vực nạp sạc xe điện.</li>
      </ul>

      <h3>3. Phản hồi tích cực từ hành khách và đối tác</h3>
      <p>Ngay sau khi đi vào vận hành thực tế, chương trình đã nhận được những đánh giá rất cao từ phía hành khách và các cơ quan quản lý giao thông. Đa số khách hàng bày tỏ sự hài lòng với thái độ phục vụ văn minh của đội ngũ nhân viên cũng như sự êm ái trên suốt chặng đường.</p>

      <blockquote class="custom-quote">
        "VIAGO cam kết không ngừng nỗ lực để mỗi chuyến đi của quý khách luôn là một hành trình an toàn, tiện nghi và trọn vẹn niềm vui!"
      </blockquote>
    `;
  }

  getAllNews(): NewsItem[] {
    return this.newsList;
  }

  getNewsById(id: string): NewsItem | undefined {
    return this.newsList.find(item => item.id === id);
  }

  getFeaturedNews(category: string = 'all'): {
    main?: NewsItem;
    grid: NewsItem[];
    subHighlight?: NewsItem;
    subGrid: NewsItem[];
  } {
    if (category === 'all') {
      const main = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'main');
      const grid1 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'grid-1');
      const grid2 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'grid-2');
      const grid3 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'grid-3');
      const grid4 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'grid-4');

      const subHighlight = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'sub-highlight');
      const subGrid1 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'sub-grid-1');
      const subGrid2 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'sub-grid-2');
      const subGrid3 = this.newsList.find(n => n.isFeatured && n.featuredPosition === 'sub-grid-3');

      const grid: NewsItem[] = [];
      if (grid1) grid.push(grid1);
      if (grid2) grid.push(grid2);
      if (grid3) grid.push(grid3);
      if (grid4) grid.push(grid4);

      const subGrid: NewsItem[] = [];
      if (subGrid1) subGrid.push(subGrid1);
      if (subGrid2) subGrid.push(subGrid2);
      if (subGrid3) subGrid.push(subGrid3);

      return {
        main: main || this.newsList[0],
        grid: grid.length > 0 ? grid : this.newsList.slice(1, 5),
        subHighlight: subHighlight || this.newsList[5],
        subGrid: subGrid.length > 0 ? subGrid : this.newsList.slice(6, 9)
      };
    }

    // Category specific featured items
    const catArticles = this.newsList.filter(n => n.category === category);
    if (catArticles.length === 0) {
      return { grid: [], subGrid: [] };
    }

    const main = catArticles[0];
    const grid = catArticles.slice(1, 5);
    const subHighlight = catArticles[5];
    const subGrid = catArticles.slice(6, 9);

    return {
      main,
      grid,
      subHighlight,
      subGrid
    };
  }

  getNewsListFiltered(
    category: string = 'all',
    searchTerm: string = '',
    timeFilter: string = 'all',
    sortBy: string = 'newest'
  ): NewsItem[] {
    let result = [...this.newsList];

    // Filter by Category
    if (category !== 'all') {
      result = result.filter(item => item.category === category);
    }

    // Filter by Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.summary.toLowerCase().includes(term) ||
        item.tags.some(t => t.toLowerCase().includes(term))
      );
    }

    // Sort
    if (sortBy === 'newest') {
      result.reverse();
    } else if (sortBy === 'popular') {
      result.sort((a, b) => b.viewCount - a.viewCount);
    }

    return result;
  }

  getRelatedNews(currentId: string, category: string, limit: number = 3): NewsItem[] {
    return this.newsList
      .filter(item => item.id !== currentId && item.category === category)
      .slice(0, limit);
  }

  addComment(newsId: string, authorName: string, content: string): CommentItem | null {
    const article = this.getNewsById(newsId);
    if (!article) return null;

    const newComment: CommentItem = {
      id: 'c_' + Date.now(),
      authorName: authorName.trim() || 'Hành khách Viago',
      createdAt: 'Vừa xong',
      content: content.trim(),
      likes: 0,
      isLiked: false,
      replies: []
    };

    article.comments.unshift(newComment);
    return newComment;
  }

  addReply(newsId: string, commentId: string, authorName: string, content: string): CommentItem | null {
    const article = this.getNewsById(newsId);
    if (!article) return null;

    const parentComment = article.comments.find(c => c.id === commentId);
    if (!parentComment) return null;

    if (!parentComment.replies) {
      parentComment.replies = [];
    }

    const newReply: CommentItem = {
      id: 'r_' + Date.now(),
      authorName: authorName.trim() || 'Hành khách Viago',
      createdAt: 'Vừa xong',
      content: content.trim(),
      likes: 0,
      isLiked: false
    };

    parentComment.replies.push(newReply);
    return newReply;
  }

  toggleLikeComment(newsId: string, commentId: string): void {
    const article = this.getNewsById(newsId);
    if (!article) return;

    const comment = article.comments.find(c => c.id === commentId);
    if (comment) {
      if (comment.isLiked) {
        comment.likes -= 1;
        comment.isLiked = false;
      } else {
        comment.likes += 1;
        comment.isLiked = true;
      }
    }
  }
}
