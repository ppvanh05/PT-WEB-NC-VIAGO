import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  workType: string;
  salary: string;
  deadline: string;
  description: string;
  requirements: string[];
  benefits: string[];
  workHours: string;
  workEnvironment: string;
  howToApply: string;
}

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './careers.html',
  styleUrls: ['../../customer-pages.css', './careers.css', '../../customer-page-theme.css']
})
export class Careers implements OnInit {
  // --- View States ---
  currentView: 'list' | 'detail' | 'apply' = 'list';
  showStatusModal: boolean = false;

  // --- Mock Data ---
  jobs: Job[] = [
    {
      id: 1,
      title: 'Tài xế xe khách (Hạng E)',
      department: 'Vận tải',
      location: 'TP. Hồ Chí Minh',
      workType: 'Toàn thời gian',
      salary: '15 - 25 Triệu',
      deadline: '30/12/2024',
      description: 'Điều khiển xe khách giường nằm tuyến cố định, đảm bảo an toàn cho hành khách và tuân thủ quy định giao thông.',
      requirements: [
        'Có bằng lái xe hạng E, kinh nghiệm lái xe trên 3 năm.',
        'Tuổi từ 25 - 45, sức khỏe tốt.',
        'Nhanh nhẹn, có trách nhiệm và tâm huyết với nghề.',
        'Thông thạo các tuyến đường trong và ngoài tỉnh.'
      ],
      benefits: [
        'Mức lương cạnh tranh + Thưởng doanh số tháng.',
        'Đóng bảo hiểm đầy đủ sau khi kết thúc thử việc.',
        'Chế độ nghỉ phép, lễ tết theo quy định.',
        'Du lịch teambuilding hàng năm.'
      ],
      workHours: 'Xoay ca linh hoạt (Ca 1: 06:00 - 14:00, Ca 2: 14:00 - 22:00)',
      workEnvironment: 'Văn phòng hiện đại, trẻ trung tại trung tâm thành phố.',
      howToApply: 'Gửi CV về email hr@viago.vn hoặc điền form trực tuyến.'
    },
    {
      id: 2,
      title: 'Nhân viên Điều phối vận hành',
      department: 'Văn phòng',
      location: 'Đà Nẵng',
      workType: 'Toàn thời gian',
      salary: '10 - 15 Triệu',
      deadline: '15/01/2025',
      description: 'Quản lý lịch trình xe, giám sát lộ trình di chuyển và xử lý các tình huống phát sinh trong ca trực.',
      requirements: [
        'Tốt nghiệp Cao đẳng trở lên chuyên ngành liên quan.',
        'Kỹ năng điều phối, xử lý tình huống tốt.',
        'Sử dụng thành thạo máy tính và phần mềm quản lý.',
        'Ưu tiên có kinh nghiệm trong ngành vận tải.'
      ],
      benefits: [
        'Lương cơ bản + Thưởng hiệu quả công việc.',
        'Môi trường làm việc năng động, chuyên nghiệp.',
        'Cơ hội thăng tiến lên cấp quản lý.'
      ],
      workHours: 'Hành chính: 08:00 - 17:00 (Nghỉ Chủ nhật)',
      workEnvironment: 'Làm việc tại văn phòng điều hành trung tâm Đà Nẵng.',
      howToApply: 'Nộp hồ sơ trực tiếp tại văn phòng hoặc qua website.'
    },
    {
      id: 3,
      title: 'Nhân viên Chăm sóc khách hàng',
      department: 'Vận hành',
      location: 'Hà Nội',
      workType: 'Xoay ca',
      salary: '8 - 12 Triệu',
      deadline: '20/12/2024',
      description: 'Tiếp nhận cuộc gọi đặt vé, tư vấn lịch trình và hỗ trợ hành khách qua các kênh hotline, fanpage.',
      requirements: [
        'Giọng nói truyền cảm, không nói ngọng, nói lắp.',
        'Kỹ năng giao tiếp và thuyết phục tốt.',
        'Nhanh nhẹn, chịu được áp lực công việc cao.'
      ],
      benefits: [
        'Lương cứng + Hoa hồng doanh thu.',
        'Được đào tạo kỹ năng CSKH chuyên nghiệp.',
        'Ưu đãi vé xe nội bộ cho bản thân và gia đình.'
      ],
      workHours: 'Xoay ca (Ca sáng: 07:00 - 15:00, Ca chiều: 14:00 - 22:00)',
      workEnvironment: 'Phòng tổng đài hiện đại, máy lạnh, đầy đủ trang thiết bị.',
      howToApply: 'Điền form ứng tuyển trên trang Tuyển dụng VIAGO.'
    },
    {
      id: 4,
      title: 'Nhân viên Bán vé tại quầy',
      department: 'Vận hành',
      location: 'Bến xe Miền Đông',
      workType: 'Xoay ca',
      salary: '7 - 10 Triệu',
      deadline: '05/01/2025',
      description: 'Trực tiếp xuất vé, thu tiền và sắp xếp hành khách lên xe tại quầy vé khu vực bến xe.',
      requirements: [
        'Trung thực, cẩn thận, có kỹ năng tính toán tốt.',
        'Giao tiếp lịch sự, niềm nở với khách hàng.',
        'Có khả năng làm việc theo ca.'
      ],
      benefits: [
        'Lương tháng 13, thưởng lễ tết.',
        'Phụ cấp ăn ca và đồng phục.',
        'Môi trường làm việc tiếp xúc nhiều khách hàng.'
      ],
      workHours: 'Xoay ca linh hoạt theo lịch bến xe.',
      workEnvironment: 'Làm việc trực tiếp tại quầy vé VIAGO ở bến xe.',
      howToApply: 'Nộp hồ sơ tại quầy vé hoặc qua website.'
    }
  ];

  selectedJob: Job | null = null;
  filteredJobs: Job[] = [];

  // --- Filter Object ---
  filters = {
    keyword: '',
    department: '',
    location: '',
    workType: ''
  };

  // --- Application Form Object ---
  applicationForm = {
    position: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    dateOfBirth: '',
    address: '',
    education: '',
    experience: '',
    portfolioLink: '',
    introduction: '',
    agreeTerms: false
  };

  // --- Form Error States ---
  formErrors: Record<string, string> = {};
  selectedCvFile: File | null = null;
  cvError: string = '';

  ngOnInit() {
    this.filteredJobs = [...this.jobs];
  }

  // --- Logic Methods ---

  filterJobs() {
    this.filteredJobs = this.jobs.filter(job => {
      const matchKeyword = !this.filters.keyword || 
        job.title.toLowerCase().includes(this.filters.keyword.toLowerCase()) ||
        job.description.toLowerCase().includes(this.filters.keyword.toLowerCase());
      
      const matchDept = !this.filters.department || job.department === this.filters.department;
      const matchLoc = !this.filters.location || job.location.includes(this.filters.location);
      const matchType = !this.filters.workType || job.workType === this.filters.workType;

      return matchKeyword && matchDept && matchLoc && matchType;
    });
  }

  openJobDetail(job: Job) {
    this.selectedJob = job;
    this.currentView = 'detail';
    window.scrollTo(0, 0);
  }

  openApplicationForm(job?: Job) {
    if (job) {
      this.selectedJob = job;
      this.applicationForm.position = job.title;
    }
    this.currentView = 'apply';
    this.formErrors = {};
    this.cvError = '';
    window.scrollTo(0, 0);
  }

  backToList() {
    this.currentView = 'list';
    this.selectedJob = null;
    window.scrollTo(0, 0);
  }

  onCvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const allowedExtensions = ['pdf', 'doc', 'docx'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      this.cvError = '';
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        this.cvError = 'CV chỉ hỗ trợ định dạng PDF, DOC hoặc DOCX.';
        this.selectedCvFile = null;
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.cvError = 'Dung lượng CV không được vượt quá 5MB.';
        this.selectedCvFile = null;
        return;
      }

      this.selectedCvFile = file;
    }
  }

  validateApplicationForm(): boolean {
    this.formErrors = {};
    let isValid = true;

    if (!this.applicationForm.fullName.trim()) {
      this.formErrors['fullName'] = 'Họ và tên là bắt buộc.';
      isValid = false;
    }

    if (!this.applicationForm.phoneNumber.trim()) {
      this.formErrors['phoneNumber'] = 'Số điện thoại là bắt buộc.';
      isValid = false;
    }

    if (!this.applicationForm.email.trim()) {
      this.formErrors['email'] = 'Email là bắt buộc.';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.applicationForm.email)) {
        this.formErrors['email'] = 'Email không đúng định dạng.';
        isValid = false;
      }
    }

    if (!this.applicationForm.position) {
      this.formErrors['position'] = 'Vị trí ứng tuyển là bắt buộc.';
      isValid = false;
    }

    if (!this.selectedCvFile) {
      this.cvError = 'Vui lòng tải lên CV của bạn.';
      isValid = false;
    }

    if (!this.applicationForm.agreeTerms) {
      this.formErrors['agreeTerms'] = 'Bạn cần đồng ý với điều khoản.';
      isValid = false;
    }

    return isValid;
  }

  submitApplication() {
    if (this.validateApplicationForm()) {
      // Logic gửi hồ sơ (giả lập)
      this.showStatusModal = true;
    }
  }

  closeSuccessModal() {
    this.showStatusModal = false;
    this.backToList();
    // Reset form
    this.applicationForm = {
      position: '',
      fullName: '',
      phoneNumber: '',
      email: '',
      dateOfBirth: '',
      address: '',
      education: '',
      experience: '',
      portfolioLink: '',
      introduction: '',
      agreeTerms: false
    };
    this.selectedCvFile = null;
  }
}
