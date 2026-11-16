import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { AccountsAccess, Identity } from '../../../shared/accounts/accounts-access';
import type { ReviewDto } from '../../../shared/accounts/accounts.dto';
import { nextCode } from '../../../shared/sequential-code';
import type {
  ReviewMediaService,
  ReviewUpload,
  StoredReviewMedia,
} from '../profile/review-media.service';

export interface WriteReviewInput {
  /** Điều kiện tìm vé (đã giới hạn theo tài khoản hoặc theo đơn + SĐT đã xác minh). */
  where: Prisma.ve_xeWhereInput;
  /** null khi khách chưa đăng nhập (đánh giá từ trang Tra cứu vé). */
  identity: Identity | null;
  dto: ReviewDto;
  req: Request;
  files?: ReviewUpload[];
}

/**
 * Ghi một đánh giá cho một vé đã hoàn thành. Dùng chung cho
 * Hồ sơ → Lịch sử mua vé (đã đăng nhập) và trang Tra cứu vé (mã đơn + SĐT).
 * Ghi: danh_gia, tep_danh_gia (ảnh/video), nhat_ky_he_thong (CREATE_REVIEW).
 */
export async function writeTicketReview(
  prisma: PrismaService,
  access: AccountsAccess,
  media: ReviewMediaService,
  { where, identity, dto, req, files = [] }: WriteReviewInput,
) {
  const rated = dto.scores.filter((score) => score > 0);
  if (!rated.length) throw new BadRequestException('Cần chấm ít nhất một tiêu chí.');
  const stored: StoredReviewMedia[] = [];
  let reviewId = '';
  try {
    await prisma.$transaction(
      async (tx) => {
        const ticket = await tx.ve_xe.findFirst({
          where,
          select: {
            mave: true,
            trangthaive: true,
            danh_gia: { select: { madanhgia: true } },
            don_hang: { select: { makhachhang: true } },
          },
        });
        if (!ticket) throw new NotFoundException('Không tìm thấy vé cần đánh giá.');
        if (ticket.trangthaive !== 'DaHoanThanh')
          throw new BadRequestException('Chỉ được đánh giá vé đã hoàn thành chuyến đi.');
        // Mỗi vé chỉ được đánh giá một lần (danh_gia.mave là khóa duy nhất)
        if (ticket.danh_gia) throw new ConflictException('Vé này đã được đánh giá.');
        stored.push(...(await media.store(files)));
        const now = new Date();
        reviewId = await nextCode(tx, 'danh_gia', 'DG', 3);
        await tx.danh_gia.create({
          data: {
            madanhgia: reviewId,
            mave: ticket.mave,
            makhachhang: identity?.customerId ?? ticket.don_hang.makhachhang,
            diemtongquat: Math.round(rated.reduce((sum, score) => sum + score, 0) / rated.length),
            diemantoan: dto.scores[0] || null,
            diemsachse: dto.scores[1] || null,
            diemthaido: dto.scores[2] || null,
            diemdunggio: dto.scores[3] || null,
            diemthongtin: dto.scores[4] || null,
            diemtiennghi: dto.scores[5] || null,
            noidung: dto.comment,
            trangthai: 'HienThi',
            thoigiandanhgia: now,
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        if (stored.length)
          await tx.tep_danh_gia.createMany({
            data: stored.map((file, index) => ({
              matepdanhgia: file.id,
              madanhgia: reviewId,
              loaitep: file.kind,
              duongdantep: file.url,
              dungluong: BigInt(file.size),
              dinhdangtep: file.mime,
              thutuhienthi: index + 1,
              trangthai: 'HienThi',
              thoigiantailen: now,
            })),
          });
        await access.audit(tx, identity, req, 'CREATE_REVIEW', 've_xe', ticket.mave, 'Gửi đánh giá chuyến đi.');
      },
      { timeout: 15000 },
    );
  } catch (error) {
    await media.rollback(stored);
    // P2002: trùng mave (gửi 2 lần cùng lúc) hoặc trùng mã DG do 2 khách gửi cùng lúc
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictException(
        String(error.meta?.target ?? '').includes('mave')
          ? 'Vé này đã được đánh giá.'
          : 'Hệ thống đang bận, vui lòng gửi lại đánh giá.',
      );
    throw error;
  }
  return { success: true, reviewId };
}
