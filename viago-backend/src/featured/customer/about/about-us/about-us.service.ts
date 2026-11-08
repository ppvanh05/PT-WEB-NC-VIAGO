import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SiteContentService } from '../../../../shared/site-content.service';
import { vietnamDate } from '../about.dto';

@Injectable()
export class CustomerAboutUsService {
  constructor(private readonly prisma: PrismaService, private readonly content: SiteContentService) {}
  profile() { return this.content.profile(); }
  async overview() {
    const start = new Date(vietnamDate() + 'T00:00:00+07:00');
    const end = new Date(start.getTime() + 86400000);
    const [profile, statistics] = await Promise.all([
      this.profile(),
      this.prisma.$transaction(async tx => ({
        activeRoutes: await tx.tuyen_xe.count({ where: { trangthai: 'HoatDong' } }),
        activeVehicles: await tx.xe.count({ where: { trangthai: 'DangHoatDong' } }),
        tripsToday: await tx.lich_trinh.count({ where: { trangthai: { not: 'DaHuy' }, thoigiankhoihanh: { gte: start, lt: end } } }),
      }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }),
    ]);
    return { ...profile, statistics };
  }
}