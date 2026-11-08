import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { aboutRequest } from '../about-api';
import { ActivatedRoute } from '@angular/router';

interface Job {
  id: string;
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
  email?: string;
  hotline?: string;
}

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './careers.html',
  styleUrls: ['../../customer-pages.css', './careers.css', '../../customer-page-theme.css'],
})
export class Careers implements OnInit {
  // --- View States ---
  currentView: 'list' | 'detail' | 'apply' = 'list';
  showStatusModal: boolean = false;

  jobs: Job[] = [];
  loading = true;
  loadingDetail = false;
  loadError = '';
  submitError = '';
  submitting = false;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly abort = new AbortController();
  constructor() {
    this.destroy.onDestroy(() => this.abort.abort());
  }
  get locations() {
    return [...new Set(this.jobs.map((j) => j.location))];
  }
  get departments() {
    return [...new Set(this.jobs.map((j) => j.department))];
  }

  selectedJob: Job | null = null;
  filteredJobs: Job[] = [];

  // --- Filter Object ---
  filters = {
    keyword: '',
    department: '',
    location: '',
    workType: '',
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
    agreeTerms: false,
  };

  // --- Form Error States ---
  formErrors: Record<string, string> = {};
  selectedCvFile: File | null = null;
  cvError: string = '';

  ngOnInit() {
    void this.loadJobs().then(() => {
      const id = this.route?.snapshot.queryParamMap.get('job');
      if (id && !this.abort.signal.aborted) void this.openJobDetail({ id });
    });
  }
  @HostListener('window:focus') refreshAvailableJobs() {
    if (this.currentView === 'list' && !this.loading) void this.loadJobs();
  }
  async loadJobs() {
    this.loading = true;
    this.loadError = '';
    try {
      const rows: Job[] = [];
      let pages = 1;
      for (let page = 1; page <= pages; page++) {
        const result = await aboutRequest<{ data: Job[]; pagination: { totalPages: number } }>(
          '/careers?pageSize=100&page=' + page,
          undefined,
          this.abort.signal,
        );
        if (
          !Array.isArray(result.data) ||
          !Number.isInteger(result.pagination?.totalPages) ||
          result.pagination.totalPages > 20
        )
          throw new Error('Dữ liệu tuyển dụng không hợp lệ.');
        rows.push(...result.data);
        pages = result.pagination.totalPages;
      }
      this.jobs = rows;
      this.filterJobs();
    } catch (e) {
      if (!this.abort.signal.aborted)
        this.loadError = e instanceof Error ? e.message : 'Chưa tải được vị trí tuyển dụng.';
    } finally {
      if (!this.abort.signal.aborted) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  // --- Logic Methods ---

  filterJobs() {
    this.filteredJobs = this.jobs.filter((job) => {
      const matchKeyword =
        !this.filters.keyword ||
        job.title.toLowerCase().includes(this.filters.keyword.toLowerCase()) ||
        job.description.toLowerCase().includes(this.filters.keyword.toLowerCase());

      const matchDept = !this.filters.department || job.department === this.filters.department;
      const matchLoc = !this.filters.location || job.location.includes(this.filters.location);
      const matchType = !this.filters.workType || job.workType === this.filters.workType;

      return matchKeyword && matchDept && matchLoc && matchType;
    });
  }

  async openJobDetail(job: Pick<Job, 'id'>) {
    if (this.loadingDetail) return;
    this.loadingDetail = true;
    this.loadError = '';
    try {
      const detail = await aboutRequest<Job>(
        '/careers/' + encodeURIComponent(job.id),
        undefined,
        this.abort.signal,
      );
      this.selectedJob = detail;
      this.currentView = 'detail';
      window.scrollTo(0, 0);
    } catch (e) {
      if (!this.abort.signal.aborted)
        this.loadError = e instanceof Error ? e.message : 'Chưa tải được chi tiết tuyển dụng.';
    } finally {
      if (!this.abort.signal.aborted) {
        this.loadingDetail = false;
        this.cdr.markForCheck();
      }
    }
  }

  openApplicationForm(job?: Job) {
    this.submitError = '';
    if (job) {
      this.selectedJob = job;
      this.applicationForm.position = job.id;
    }
    this.currentView = 'apply';
    this.formErrors = {};
    this.cvError = '';
    window.scrollTo(0, 0);
  }

  backToList() {
    if (this.submitting) return;
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

  get positionTitle() {
    return this.jobs.find((j) => j.id === this.applicationForm.position)?.title || '';
  }
  async submitApplication() {
    if (this.submitting || !this.validateApplicationForm()) return;
    this.submitting = true;
    this.submitError = '';
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(this.applicationForm)) {
        if (key !== 'position' && value !== '') body.append(key, String(value));
      }
      body.append('cv', this.selectedCvFile!);
      const response = await aboutRequest<{ received: boolean }>(
        '/careers/' + encodeURIComponent(this.applicationForm.position) + '/applications',
        body,
        this.abort.signal,
      );
      if (!response.received) throw new Error('Chưa thể xác nhận hồ sơ. Vui lòng thử lại.');
      if (!this.abort.signal.aborted) this.showStatusModal = true;
    } catch (e) {
      if (!this.abort.signal.aborted)
        this.submitError = e instanceof Error ? e.message : 'Không gửi được hồ sơ.';
    } finally {
      if (!this.abort.signal.aborted) {
        this.submitting = false;
        this.cdr.markForCheck();
      }
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
      agreeTerms: false,
    };
    this.selectedCvFile = null;
  }
}
