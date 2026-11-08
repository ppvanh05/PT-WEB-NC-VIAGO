import { Injectable } from '@nestjs/common';
import { nextBusinessId } from '../../../../shared/business-id';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CONTACT_SUBJECTS, ContactRequestDto } from '../about.dto';
import { CustomerAboutUsService } from '../about-us/about-us.service';

@Injectable()
export class CustomerContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly about: CustomerAboutUsService,
  ) {}

  async info() {
    return {
      ...(await this.about.profile()).contact,
      subjects: Object.entries(CONTACT_SUBJECTS).map(([code, label]) => ({
        code,
        label,
      })),
    };
  }

  async submit(dto: ContactRequestDto) {
    await this.prisma.$transaction(async tx => tx.yeu_cau_lien_he.create({
      data: {
        malienhe: await nextBusinessId(tx, 'LH'),
        hoten: dto.fullName,
        sodienthoai: dto.phone,
        email: dto.email ?? null,
        chude: dto.subject,
        noidung: dto.message,
        thoigiangui: new Date(),
        trangthai: 'Moi',
      },
    }));
    return { received: true, message: 'Đã tiếp nhận yêu cầu liên hệ của bạn.' };
  }
}
