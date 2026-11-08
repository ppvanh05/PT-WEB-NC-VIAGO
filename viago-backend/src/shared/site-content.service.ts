import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GuideContent {
  id: string;
  title: string;
  description: string;
  steps: { title: string; content: string; image?: string }[];
  notes: string[];
}
export interface CompanyProfile {
  name: string;
  slogan: string;
  introduction: string;
  mission: string;
  heroImage: string;
  story: { title: string; paragraphs: string[]; mission: string };
  coreValues: { id: string; title: string; description: string }[];
  vision: { year: number; title: string; goals: string[]; images: string[] };
  contact: {
    hotline: string;
    phone: string;
    email: string;
    address: string;
    office: string;
    officeHours: string;
    officeDays: string;
    bookingSupportHours: string;
    mapUrl: string;
  };
  links: Record<string, string>;
  galleries: {
    type: string;
    label: string;
    image: string;
    pages: {
      title: string;
      items: { image: string; title: string; description: string }[];
    }[];
  }[];
}
@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService) {}
  async page<T>(slug: string) {
    const rows = await this.prisma.$queryRaw<
      { noidung: T; thoigiancapnhat: Date }[]
    >`
      SELECT noidung, thoigiancapnhat FROM public.noi_dung_trang
      WHERE slug = ${slug} AND trangthai = 'DaXuatBan'`;
    if (!rows.length)
      throw new NotFoundException('Nội dung chưa được xuất bản.');
    return {
      ...rows[0].noidung,
      updatedAt: rows[0].thoigiancapnhat.toISOString(),
    };
  }
  async guides(): Promise<GuideContent[]> {
    const rows = await this.prisma.$queryRaw<
      { slug: string; tieude: string; noidung: GuideContent }[]
    >`
      SELECT slug, tieude, noidung FROM public.noi_dung_trang
      WHERE loai = 'HuongDan' AND trangthai = 'DaXuatBan' ORDER BY thutu, slug`;
    return rows.map((row) => ({
      ...row.noidung,
      id: row.slug,
      title: row.tieude,
    }));
  }
  profile() {
    return this.page<CompanyProfile>('about-us');
  }
}
