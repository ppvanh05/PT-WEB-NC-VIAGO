import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CustomerInvoiceService {
  constructor(private readonly prisma: PrismaService) {}
  async lookup(rawCode: string) {
    const code = rawCode.trim();
    if (!code || code.length > 100) throw new BadRequestException('Mã tra cứu hóa đơn không hợp lệ.');
    const invoice = await this.prisma.hoa_don_dien_tu.findUnique({
      where: { matracuu: code },
      select: {
        matracuu: true, sohoadon: true, kyhieuhoadon: true, hotennguoimua: true,
        tencongty: true, tendonviban: true, tongtienhoadon: true, trangthaihoadon: true,
        ketquaxacthuc: true, thoigianxuat: true, thoigianyeucau: true,
        linkanhxemtruoc: true, linktaihoadon: true, linkxml: true,
        don_hang: { select: { hotennguoidat: true, lich_trinh: { select: {
          thoigiankhoihanh: true, tuyen_xe: { select: { diemdi: true, diemden: true } },
        } } } },
      },
    });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn với mã tra cứu này.');
    const valid = invoice.trangthaihoadon === 'DaXuat' && invoice.ketquaxacthuc === 'HopLe';
    return {
      lookupCode: invoice.matracuu, invoiceNumber: invoice.sohoadon ?? '', symbol: invoice.kyhieuhoadon ?? '',
      issueDate: (invoice.thoigianxuat ?? invoice.thoigianyeucau).toISOString(),
      company: invoice.tencongty || invoice.tendonviban,
      customer: invoice.hotennguoimua || invoice.don_hang.hotennguoidat,
      route: `${invoice.don_hang.lich_trinh.tuyen_xe.diemdi} - ${invoice.don_hang.lich_trinh.tuyen_xe.diemden}`,
      departureAt: invoice.don_hang.lich_trinh.thoigiankhoihanh.toISOString(),
      totalAmount: Number(invoice.tongtienhoadon), status: valid ? 'valid' : 'invalid',
      invoiceStatus: invoice.trangthaihoadon, verificationStatus: invoice.ketquaxacthuc,
      previewUrl: invoice.linkanhxemtruoc, downloadUrl: invoice.linktaihoadon, xmlUrl: invoice.linkxml,
    };
  }
}
