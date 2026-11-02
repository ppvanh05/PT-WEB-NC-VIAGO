import { Component, ElementRef, ViewChild, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './chatbot.css',
  templateUrl: './chatbot.html',
})
export class Chatbot implements AfterViewChecked {
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  constructor(private cdr: ChangeDetectorRef) {}

  isOpen = false;
  isTyping = false;
  userInput = '';

  messages: any[] = [
    { text: 'Xin chào! Mình là Trợ lý Ảo của VIAGO. Mình có thể giúp gì cho chuyến đi của bạn hôm nay?', isBot: true, time: this.getCurrentTime() }
  ];

  suggestions = [
    'Tra cứu chuyến đi',
    'Chính sách hoàn/huỷ',
    'Mua vé khứ hồi',
    'Gặp nhân viên hỗ trợ'
  ];

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  sendSuggestion(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    // Add user message
    this.messages.push({ text: text, isBot: false, time: this.getCurrentTime() });
    this.userInput = '';
    
    // Simulate typing briefly for visual effect, but reply almost instantly
    this.isTyping = true;
    this.cdr.detectChanges();
    this.scrollToBottom();
    
    setTimeout(() => {
      this.isTyping = false;
      this.generateBotResponse(text);
      this.cdr.detectChanges();
      this.scrollToBottom();
    }, 100);
  }

  generateBotResponse(userText: string) {
    const text = userText.toLowerCase();
    
    // Câu trả lời mặc định nếu không hiểu (Vui nhộn, tinh tế)
    let reply = 'Dạ Trợ lý ảo hơi "ngốc nghếch" xíu nên chưa hiểu hết ý bạn. Bạn có thể nói rõ hơn hoặc gõ chữ <b>Gặp nhân viên</b> để mình gọi "con người" ra hỗ trợ bạn ngay và luôn nha!';
    
    // Các từ khóa chửi bậy, tức giận
    const angryWords = [' lừa đảo', ' bực mình', ' làm ăn như', ' chó', ' điên ', ' đkm', ' vcl'];
    const isAngry = angryWords.some(word => text.includes(word));

    if (isAngry) {
      reply = 'Ấy ấy, khách yêu ơi xin bớt nóng bớt nóng! Có chuyện gì từ từ nói nè, giận quá là nhăn da mau già đó nha. Bạn đang gặp sự cố gì bực mình cứ kể nghe, VIAGO sẽ giải quyết đến nơi đến chốn cho bạn luôn!';
    } 
    else if (text.includes('đặt vé') || text.includes('mua vé') || text.includes('book vé')) {
      reply = 'Để đặt vé, bạn có thể quay lại <b>Trang chủ</b> và sử dụng công cụ Tìm chuyến đi, hoặc bấm vào phần <b>Lịch trình</b> trên thanh menu nhé! Chúc bạn chọn được vé ưng ý.';
    } 
    else if (text.includes('tra cứu') || text.includes('kiểm tra vé') || text.includes('xem vé') || text.includes('thông tin chuyến')) {
      reply = 'Để tra cứu vé, bạn vui lòng cung cấp <b>Mã số vé</b> (ví dụ: VG123456) hoặc <b>Số điện thoại</b> đặt vé nhé! Mình sẽ dùng tốc độ ánh sáng để kiểm tra ngay.';
    } 
    else if (text.includes('hoàn') || text.includes('hủy') || text.includes('huỷ')) {
      reply = 'Quy định hoàn/huỷ của VIAGO như sau:<br>- <b>Hủy trước 24h:</b> Miễn phí hoàn tiền 100%.<br>- <b>Hủy trong vòng 24h:</b> Phí 20% giá vé.<br>Bạn cần hỗ trợ hủy chuyến nào để mình giúp ạ?';
    } 
    else if (text.includes('thuê xe') || text.includes('bao xe') || text.includes('mướn xe') || text.includes('hợp đồng')) {
      reply = 'VIAGO có cung cấp dịch vụ cho thuê xe hợp đồng từ 16 đến 45 chỗ đời mới siêu xịn sò luôn! Bạn vui lòng truy cập vào phần <b>Dịch vụ</b> trên thanh menu hoặc để lại Số điện thoại để chuyên viên tư vấn gọi lại báo giá tốt nhất nha!';
    }
    else if (text.includes('mất đồ') || text.includes('quên đồ') || text.includes('thất lạc')) {
      reply = 'Ôi đừng quá lo lắng nhé! VIAGO có hẳn một trang <b>Đồ Thất Lạc</b> luôn. Bạn vui lòng truy cập vào mục <b>Dịch vụ -> Đồ thất lạc</b> để xem danh sách hoặc điền form báo mất đồ nha. Mong bạn sớm tìm lại được bảo bối!';
    }
    else if (text.includes('tin tức') || text.includes('tuyển dụng') || text.includes('khuyến mãi') || text.includes('ưu đãi')) {
      reply = 'Dạ, để xem các thông tin ưu đãi hấp dẫn, tin tức mới nhất hoặc các vị trí đang tuyển dụng, bạn vui lòng nhấn vào mục <b>Tin tức</b> trên thanh Menu chính nhé! Chúc bạn săn được nhiều deal hời!';
    }
    else if (text.includes('địa chỉ') || text.includes('liên hệ') || text.includes('tổng đài') || text.includes('số điện thoại')) {
      reply = 'Tổng đài chăm sóc khách hàng của VIAGO là <b>1900 9999</b>. Trụ sở chính nằm tại Bến xe Miền Tây. Bạn có thể kéo xuống cuối trang (Footer) để xem thêm chi tiết các văn phòng đại diện nhé!';
    }
    else if (text.includes('nhân viên') || text.includes('cskh') || text.includes('gặp') || text.includes('người') || text.includes('hỗ trợ')) {
      reply = 'Dạ vâng! Mình đang kết nối tới Chuyên viên Hỗ trợ Khách hàng (CSKH). Sẽ có "người thật việc thật" tư vấn trực tiếp cho bạn ngay sau vài giây... Vui lòng giữ máy nha!';
      
      // Giả lập nhân viên thật tham gia chat sau 2.5 giây
      setTimeout(() => {
        this.isTyping = true;
        this.cdr.detectChanges();
        this.scrollToBottom();
        
        setTimeout(() => {
          this.isTyping = false;
          this.messages.push({ 
            text: 'Dạ em chào anh/chị ạ. Em là <b>Mỹ Linh - Chuyên viên CSKH VIAGO</b>. Anh/chị đang cần hỗ trợ vấn đề gì để em xử lý ngay cho mình ạ?', 
            isBot: true, 
            isAgent: true,
            time: this.getCurrentTime() 
          });
          this.cdr.detectChanges();
          this.scrollToBottom();
        }, 1000);
      }, 1500);
    } 
    else if (text.startsWith('chào') || text.startsWith('hi ') || text.startsWith('hello') || text === 'hi' || text === 'ê' || text.includes('xin chào')) {
      reply = 'Dạ chào bạn! Trợ lý ảo VIAGO rất hân hạnh được phục vụ. Hôm nay mình có thể giúp gì cho chuyến đi của bạn thêm phần trọn vẹn ạ?';
    }

    this.messages.push({ text: reply, isBot: true, time: this.getCurrentTime() });
  }
}
