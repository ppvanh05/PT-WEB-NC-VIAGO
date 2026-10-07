import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface EscalatedChat {
  id: string;
  customerName: string;
  avatar: string;
  sentiment: 'Low' | 'Medium' | 'High';
  emotionScore: number;
  summary: string;
  time: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  sender: 'bot' | 'customer' | 'agent';
  text: string;
  time: string;
}

@Component({
  selector: 'app-support-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support-queue.html',
  styleUrl: './support-queue.css',
})
export class SupportQueue {
  escalatedChats: EscalatedChat[] = [
    {
      id: 'C1001',
      customerName: 'Nguyễn Văn Hải',
      avatar: 'https://ui-avatars.com/api/?name=NVH&background=ef4444&color=fff',
      sentiment: 'High',
      emotionScore: 8,
      summary: 'Khách bức xúc vì xe trễ 40 phút tại Bến xe Miền Tây. Khách đe dọa bóc phốt trên MXH. Dự báo leo thang lượt 2.',
      time: '10:45 AM',
      messages: [
        { sender: 'bot', text: 'Xin chào, VIAGO có thể giúp gì cho bạn?', time: '10:40 AM' },
        { sender: 'customer', text: 'Xe đi đâu mà trễ 40 phút rồi chưa thấy? Làm ăn kiểu gì vậy?', time: '10:41 AM' },
        { sender: 'bot', text: 'VIAGO rất xin lỗi vì sự bất tiện này. Bạn vui lòng cung cấp mã vé để hệ thống kiểm tra định vị xe ạ.', time: '10:41 AM' },
        { sender: 'customer', text: 'Mã vé VG998877. Tôi trễ giờ họp quan trọng rồi, không giải quyết nhanh tôi bóc phốt lên mạng!', time: '10:43 AM' },
        { sender: 'bot', text: 'Hệ thống ghi nhận xe đang kẹt xe tại Quốc Lộ 1A. Chuyên viên CSKH sẽ hỗ trợ bạn ngay lập tức.', time: '10:44 AM' }
      ]
    },
    {
      id: 'C1002',
      customerName: 'Lê Thị Mai',
      avatar: 'https://ui-avatars.com/api/?name=LTM&background=eab308&color=fff',
      sentiment: 'Medium',
      emotionScore: 5,
      summary: 'Khách muốn đổi vé sát giờ khởi hành (còn 2 tiếng) do bận việc đột xuất. Yêu cầu chính sách hoàn hủy.',
      time: '11:15 AM',
      messages: [
        { sender: 'customer', text: 'Mình muốn đổi vé đi Đà Lạt sang ngày mai được không?', time: '11:10 AM' },
        { sender: 'bot', text: 'Chào bạn, theo quy định, vé đổi trước giờ khởi hành 24h sẽ được miễn phí. Nếu vé của bạn sát giờ hơn, sẽ có phí phát sinh.', time: '11:11 AM' },
        { sender: 'customer', text: 'Vé mình đi lúc 1h chiều nay, giờ là 11h rồi. Có cách nào linh động không bạn?', time: '11:14 AM' }
      ]
    },
    {
      id: 'C1003',
      customerName: 'Trần Bình',
      avatar: 'https://ui-avatars.com/api/?name=TB&background=22c55e&color=fff',
      sentiment: 'Low',
      emotionScore: 2,
      summary: 'Khách thắc mắc về điểm đón trung chuyển tại Quận 7. Cần xác nhận lại thời gian đón.',
      time: '11:30 AM',
      messages: [
        { sender: 'customer', text: 'Cho hỏi xe trung chuyển có đón ở Vivo City Quận 7 không?', time: '11:25 AM' },
        { sender: 'bot', text: 'Chào bạn, VIAGO có hỗ trợ đón trung chuyển miễn phí tại Quận 7.', time: '11:26 AM' },
        { sender: 'customer', text: 'Vậy tôi đặt xe chuyến 15h, mấy giờ xe trung chuyển sẽ đến đón?', time: '11:29 AM' }
      ]
    }
  ];

  activeChat: EscalatedChat | null = null;
  replyMessage: string = '';

  quickResponses = [
    { title: 'Mẫu xin lỗi trễ giờ', text: 'Dạ VIAGO vô cùng xin lỗi anh/chị vì sự cố trễ chuyến ngoài ý muốn do điều kiện giao thông. Hiện tại xe đang nỗ lực di chuyển đến điểm đón. Mong anh/chị thông cảm chờ thêm ít phút ạ.' },
    { title: 'Mẫu tặng Voucher 20%', text: 'Để bù đắp phần nào trải nghiệm chưa tốt vừa qua, VIAGO xin gửi tặng anh/chị Mã giảm giá 20% (Tối đa 100k) cho chuyến đi tiếp theo. Mã voucher là: SORRY20. VIAGO rất mong nhận được sự lượng thứ từ anh/chị.' },
    { title: 'Mẫu xác nhận hoàn tiền', text: 'Dạ yêu cầu hoàn tiền vé của anh/chị đã được VIAGO tiếp nhận. Số tiền sẽ được hoàn về tài khoản của anh/chị trong vòng 3-5 ngày làm việc. Mong anh/chị thông cảm vì sự bất tiện này.' },
    { title: 'Mẫu hỗ trợ linh động đổi vé', text: 'Dạ VIAGO hiểu tình huống đột xuất của anh/chị. Em xin phép hỗ trợ linh động đổi vé sang chuyến ngày mai cho anh/chị mà không thu thêm phụ phí. Anh/chị xác nhận đồng ý đổi sang giờ nào ạ?' }
  ];

  openChat(chat: EscalatedChat) {
    this.activeChat = chat;
  }

  closeChat() {
    this.activeChat = null;
  }

  useQuickResponse(template: string) {
    this.replyMessage = template;
  }

  sendMessage() {
    if (!this.replyMessage.trim() || !this.activeChat) return;
    
    this.activeChat.messages.push({
      sender: 'agent',
      text: this.replyMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    
    this.replyMessage = '';
  }
}
