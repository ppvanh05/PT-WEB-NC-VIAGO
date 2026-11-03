import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CONTACT_SUBJECTS, ContactRequestDto } from '../about.dto';
import { CustomerAboutUsService } from '../about-us/about-us.service';

@Injectable()
export class CustomerContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly about: CustomerAboutUsService,
  ) {}

  info() {
    return {
      ...this.about.profile().contact,
      subjects: Object.entries(CONTACT_SUBJECTS).map(([code, label]) => ({
        code,
        label,
      })),
    };
  }

  async submit(dto: ContactRequestDto) {
    await this.prisma.yeu_cau_lien_he.create({
      data: {
        malienhe: `LH${randomUUID().replaceAll('-', '').toUpperCase()}`,
        hoten: dto.fullName,
        sodienthoai: dto.phone,
        email: dto.email ?? null,
        chude: dto.subject,
        noidung: dto.message,
        thoigiangui: new Date(),
        trangthai: 'Moi',
      },
    });
    return { received: true, message: 'Đã tiếp nhận yêu cầu liên hệ của bạn.' };
  }
}
