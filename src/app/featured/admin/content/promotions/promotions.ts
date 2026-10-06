import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Promotion {
  id: number;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  startDate: string;
  endDate: string;
  status: 'running' | 'upcoming' | 'expired';
  usageCount: number;
  limitPerUser: number;
  targetTiers: string[];
}

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotions.html',
  styleUrls: ['./promotions.css']
})
export class PromotionsComponent implements OnInit {
  promotions: Promotion[] = [
    {
      id: 1,
      code: 'WELCOME50',
      name: 'Chào mừng khách mới - Welcome Gift',
      discountType: 'fixed',
      discountValue: 50000,
      minOrderValue: 0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'running',
      usageCount: 1450,
      limitPerUser: 1,
      targetTiers: ['Tất cả']
    },
    {
      id: 2,
      code: 'EARLYBIRD15',
      name: 'Đặt sớm - Early Bird 15%',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscount: 45000,
      minOrderValue: 150000,
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      status: 'expired',
      usageCount: 890,
      limitPerUser: 2,
      targetTiers: ['Bạc', 'Vàng', 'Kim cương']
    },
    {
      id: 3,
      code: 'SUMMER30',
      name: 'Hè rực rỡ - Summer Special',
      discountType: 'fixed',
      discountValue: 30000,
      minOrderValue: 120000,
      startDate: '2026-05-15',
      endDate: '2026-08-31',
      status: 'running',
      usageCount: 2130,
      limitPerUser: 3,
      targetTiers: ['Tất cả']
    },
    {
      id: 4,
      code: 'TET2027',
      name: 'Tết Nguyên Đán 2027',
      discountType: 'percentage',
      discountValue: 25,
      maxDiscount: 100000,
      minOrderValue: 250000,
      startDate: '2027-01-01',
      endDate: '2027-02-15',
      status: 'upcoming',
      usageCount: 0,
      limitPerUser: 1,
      targetTiers: ['Tất cả']
    }
  ];

  filteredPromotions: Promotion[] = [];
  searchQuery = '';
  activeTab: 'all' | 'running' | 'upcoming' | 'expired' = 'all';

  isModalOpen = false;
  isEditMode = false;
  currentPromo: Partial<Promotion> = {};
  showToast = false;
  toastMessage = '';

  availableTiers = ['Tất cả', 'Bạc', 'Vàng', 'Kim cương'];

  ngOnInit() {
    this.filterData();
  }

  setTab(tab: 'all' | 'running' | 'upcoming' | 'expired') {
    this.activeTab = tab;
    this.filterData();
  }

  filterData() {
    this.filteredPromotions = this.promotions.filter(p => {
      if (this.activeTab !== 'all' && p.status !== this.activeTab) return false;
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(query) && !p.code.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentPromo = {
      code: '',
      name: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 0,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: '',
      status: 'upcoming',
      limitPerUser: 1,
      targetTiers: ['Tất cả']
    };
    this.isModalOpen = true;
  }

  openEditModal(promo: Promotion, event: Event) {
    event.stopPropagation();
    this.isEditMode = true;
    this.currentPromo = JSON.parse(JSON.stringify(promo));
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  savePromotion() {
    if (!this.currentPromo.code || !this.currentPromo.name || !this.currentPromo.startDate || !this.currentPromo.endDate) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc (Mã, Tên, Ngày bắt đầu, Ngày kết thúc)!');
      return;
    }

    if (this.currentPromo.startDate > this.currentPromo.endDate) {
      alert('Ngày bắt đầu không được lớn hơn ngày kết thúc!');
      return;
    }

    // Auto determine status
    const now = new Date().toISOString().substring(0, 10);
    let autoStatus: 'running' | 'upcoming' | 'expired' = 'upcoming';
    if (this.currentPromo.endDate < now) {
      autoStatus = 'expired';
    } else if (this.currentPromo.startDate <= now && this.currentPromo.endDate >= now) {
      autoStatus = 'running';
    }
    this.currentPromo.status = autoStatus;

    if (this.isEditMode) {
      const index = this.promotions.findIndex(p => p.id === this.currentPromo.id);
      if (index > -1) {
        this.promotions[index] = this.currentPromo as Promotion;
      }
      this.triggerToast('Cập nhật khuyến mãi thành công!');
    } else {
      const newPromo: Promotion = {
        ...(this.currentPromo as Promotion),
        id: this.promotions.length > 0 ? Math.max(...this.promotions.map(p => p.id)) + 1 : 1,
        usageCount: 0
      };
      this.promotions.unshift(newPromo);
      this.triggerToast('Tạo mới khuyến mãi thành công!');
    }

    this.filterData();
    this.closeModal();
  }

  toggleTier(tier: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (!this.currentPromo.targetTiers) this.currentPromo.targetTiers = [];
    
    if (isChecked) {
      if (tier === 'Tất cả') {
        this.currentPromo.targetTiers = ['Tất cả'];
      } else {
        this.currentPromo.targetTiers = this.currentPromo.targetTiers.filter(t => t !== 'Tất cả');
        this.currentPromo.targetTiers.push(tier);
      }
    } else {
      this.currentPromo.targetTiers = this.currentPromo.targetTiers.filter(t => t !== tier);
      if (this.currentPromo.targetTiers.length === 0) {
        this.currentPromo.targetTiers = ['Tất cả'];
      }
    }
  }

  generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'VGO';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.currentPromo.code = code;
  }

  triggerToast(msg: string) {
    this.toastMessage = msg;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 2500);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', 'đ');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'running': return 'badge-success';
      case 'upcoming': return 'badge-warning';
      case 'expired': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'running': return 'Đang chạy';
      case 'upcoming': return 'Sắp diễn ra';
      case 'expired': return 'Hết hạn';
      default: return status;
    }
  }

  getCount(status: string) {
    return this.promotions.filter(p => p.status === status).length;
  }
}
