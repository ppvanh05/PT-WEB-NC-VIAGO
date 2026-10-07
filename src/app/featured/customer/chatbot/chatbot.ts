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

  messages = [
    { text: 'Xin chào! Mình là Trợ lý Ảo của VIAGO 👋. Mình có thể giúp gì cho chuyến đi của bạn hôm nay?', isBot: true, time: this.getCurrentTime() }
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
    let reply = 'Dạ mình đã ghi nhận thông tin. Bạn có thể cho mình xin thêm chi tiết để hỗ trợ tốt nhất không ạ?';
    
    if (text.includes('tra cứu') || text.includes('chuyến đi') || text.includes('vé')) {
      reply = 'Để tra cứu vé, bạn vui lòng cung cấp **Mã số vé** (ví dụ: VG123456) hoặc **Số điện thoại** đặt vé nhé! Mình sẽ kiểm tra ngay lập tức.';
    } else if (text.includes('hoàn') || text.includes('hủy') || text.includes('huỷ')) {
      reply = 'Quy định hoàn/huỷ của VIAGO như sau:<br>- <b>Hủy trước 24h:</b> Miễn phí hoàn tiền 100%.<br>- <b>Hủy trong vòng 24h:</b> Phí 20% giá vé.<br>Bạn cần hỗ trợ hủy chuyến nào ạ?';
    } else if (text.includes('nhân viên') || text.includes('cskh') || text.includes('gặp') || text.includes('người')) {
      reply = 'Mình đang kết nối tới Chuyên viên Hỗ trợ Khách hàng (CSKH). Sẽ có người tư vấn trực tiếp cho bạn ngay sau giây lát... 🎧';
    } else if (text.includes('xin chào') || text.includes('hello') || text.includes('chào') || text.includes('hi')) {
      reply = 'Chào bạn! VIAGO rất hân hạnh được phục vụ. Bạn cần hỗ trợ đặt vé hay kiểm tra thông tin chuyến đi ạ?';
    }

    this.messages.push({ text: reply, isBot: true, time: this.getCurrentTime() });
  }
}
