import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { normalize } from '../../../../integrations/chatbot/chatbot.analysis';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CustomerHomeService } from '../../home/catalog/home.service';
import { HomeTripsDto, todayVN } from '../../home/common/home.dto';
import {
  PolicyLookupDto,
  KnowledgeLookupDto,
  RouteLookupDto,
  supportTools,
} from '../tools/query-tools';
import { searchFaqKnowledge } from './faq-retrieval';
import { ChatbotRagService } from './rag.service';
import { HomePromotionsService } from '../../home/promotions/promotions.service';
import type {
  ChatbotMemory,
  ChatbotToolkit,
} from '../../../../integrations/chatbot/chatbot.tools';

@Injectable()
export class SupportKnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly home: CustomerHomeService,
    @Optional() private readonly rag?: ChatbotRagService,
    @Optional() private readonly promotions?: HomePromotionsService,
  ) {}
  context(memory: ChatbotMemory) {
    return {
      todayVietnam: todayVN(),
      timeZone: 'Asia/Ho_Chi_Minh',
      memory,
      runtimeCapabilities: {
        ...this.home.options(),
      },
      instructions:
        'Memory is prior customer context, not fresh database facts. Use the available read-only tools to answer questions requiring current data. Ask for missing search fields rather than handing off.',
    };
  }
  toolkit(memory: ChatbotMemory, authorization?: string): ChatbotToolkit {
    return {
      definitions: supportTools,
      execute: async (name, args) => {
        const result = await this.execute(name, args, authorization);
        if (name === 'search_trips' && !('error' in result))
          memory.lastTripSearch = args as Record<string, unknown>;
        return result;
      },
    };
  }
  async execute(
    name: string,
    args: unknown,
    authorization?: string,
  ): Promise<Record<string, unknown>> {
    const definition = supportTools.find((tool) => tool.function.name === name);
    if (!definition || !args || typeof args !== 'object' || Array.isArray(args))
      return { error: 'invalid_query' };
    const properties = definition.function.parameters.properties as Record<
      string,
      unknown
    >;
    if (Object.keys(args).some((key) => !Object.hasOwn(properties, key)))
      return {
        error: 'invalid_query',
        instruction: 'Only use documented fields; do not send SQL.',
      };
    const values = Object.fromEntries(
      Object.entries(args).filter(([, value]) => value !== null),
    );
    if (name === 'lookup_booking') {
      if (
        typeof values.code !== 'string' ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(values.code)
      )
        return { error: 'invalid_query' };
      // Identity is resolved from the request, never from model arguments or text.
      let customer: { makhachhang: string } | null = null;
      try {
        customer =
          (await this.promotions?.customer(authorization, this.prisma, true)) ??
          null;
      } catch {
        /* Do not reveal whether a supplied code exists. */
      }
      if (!customer)
        return {
          error: 'authentication_required',
          instruction:
            'A valid backend customer session is required. Guide the customer to authenticated booking lookup or offer staff; never ask for passwords, OTPs or session tokens in chat.',
        };
      const order = await this.prisma.don_hang.findFirst({
        where: {
          makhachhang: customer.makhachhang,
          OR: [
            { madonhang: values.code },
            { ve_xe: { some: { mave: values.code } } },
          ],
        },
        select: {
          madonhang: true,
          trangthaidonhang: true,
          thoigianhethangiucho: true,
          tongthanhtoan: true,
          thanh_toan: {
            orderBy: { thoigiantao: 'desc' },
            take: 3,
            select: {
              trangthaithanhtoan: true,
              sotienthanhtoan: true,
              maloi: true,
            },
          },
          ve_xe: { take: 5, select: { mave: true, trangthaive: true } },
        },
      });
      if (!order)
        return {
          source: 'live_database',
          found: false,
          instruction:
            "No matching booking within the authenticated account. Do not disclose other customers' data.",
        };
      return {
        source: 'live_database',
        retrievedAt: new Date().toISOString(),
        order: {
          id: order.madonhang,
          status: order.trangthaidonhang,
          expiresAt: order.thoigianhethangiucho.toISOString(),
          totalVnd: Number(order.tongthanhtoan),
          payments: order.thanh_toan.map((payment) => ({
            status: payment.trangthaithanhtoan,
            amountVnd: Number(payment.sotienthanhtoan),
            requiresReview: !!payment.maloi,
          })),
          tickets: order.ve_xe.map((ticket) => ({
            id: ticket.mave,
            status: ticket.trangthaive,
          })),
        },
        instruction:
          'Read-only snapshot. Never infer payment success from customer claims or change any transaction.',
      };
    }
    if (name === 'search_knowledge') {
      const query = plainToInstance(KnowledgeLookupDto, values);
      if (
        validateSync(query, { whitelist: true, forbidNonWhitelisted: true })
          .length
      )
        return {
          error: 'invalid_query',
          instruction:
            'Use a specific query of 2–150 characters and a valid FAQ category or null.',
        };
      const faq = await searchFaqKnowledge(
        this.prisma,
        query.query,
        query.category,
      );
      const documents = await this.rag?.search(query.query);
      return {
        ...faq,
        documents: documents?.articles ?? [],
        sources: [...faq.sources, ...(documents?.sources ?? [])].slice(0, 3),
        total: faq.articles.length + (documents?.articles.length ?? 0),
      };
    }
    if (name === 'get_company_info')
      return {
        hotline: process.env.COMPANY_HOTLINE || null,
        email: process.env.COMPANY_EMAIL || null,
        address: process.env.COMPANY_ADDRESS || null,
      };
    if (name === 'search_trips') {
      const query = plainToInstance(HomeTripsDto, values);
      if (
        validateSync(query, { whitelist: true, forbidNonWhitelisted: true })
          .length
      )
        return {
          error: 'invalid_query',
          instruction:
            'Ask the customer for valid departure city, destination, YYYY-MM-DD date and 1–5 tickets.',
        };
      query.page = 1;
      query.pageSize = 3;
      try {
        const result = await this.home.search(query);
        return {
          source: 'live_database',
          retrievedAt: new Date().toISOString(),
          query: values,
          total: result.outbound.pagination.total,
          trips: result.outbound.data.map((trip) => ({
            id: trip.id,
            from: trip.from,
            to: trip.to,
            date: trip.date,
            departureTimeVietnam: new Date(trip.departureAt).toLocaleTimeString(
              'vi-VN',
              {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              },
            ),
            type: trip.type,
            baseFareVnd: trip.price,
            availableSeats: trip.availableSeats,
            seatFareMinVnd: Math.min(
              ...trip.seatDetails
                .filter((seat) => seat.status === 'available')
                .map((seat) => seat.price),
            ),
            pickup: trip.pickup.map((point) => point.name).slice(0, 3),
            dropoff: trip.dropoff.map((point) => point.name).slice(0, 3),
          })),
          bookingUrl:
            '/customer?' +
            new URLSearchParams({
              from: query.from,
              to: query.to,
              date: query.date,
              autoSearch: 'true',
            }),
          instruction:
            'Availability is a snapshot, not a reservation. Zero matches means no matching saleable trips in the database, not that the route never exists. Direct the customer to choose a trip on the booking page; do not claim to book it.',
        };
      } catch (error) {
        if (
          error instanceof Error &&
          'getStatus' in error &&
          typeof error.getStatus === 'function' &&
          error.getStatus() === 400
        )
          return {
            error: 'invalid_search',
            instruction:
              'Departure must differ from destination; date must be within the next 365 days. Ask the customer to correct the search.',
          };
        throw error;
      }
    }
    if (name === 'search_routes') {
      const query = plainToInstance(RouteLookupDto, values);
      if (
        validateSync(query, { whitelist: true, forbidNonWhitelisted: true })
          .length
      )
        return { error: 'invalid_query' };
      const keyword = query.query?.trim();
      const routes = await this.prisma.tuyen_xe.findMany({
        where: {
          trangthai: 'HoatDong',
          ...(keyword
            ? {
                OR: ['tentuyen', 'diemdi', 'diemden'].map((field) => ({
                  [field]: { contains: keyword, mode: 'insensitive' },
                })),
              }
            : {}),
        },
        take: 5,
        orderBy: { matuyenduong: 'asc' },
        select: {
          matuyenduong: true,
          tentuyen: true,
          diemdi: true,
          diemden: true,
        },
      });
      return {
        source: 'database',
        routes,
        instruction:
          'Limited active-route catalog. Call search_trips for live departure times, prices and seats.',
      };
    }
    const query = plainToInstance(PolicyLookupDto, values);
    if (
      validateSync(query, { whitelist: true, forbidNonWhitelisted: true })
        .length
    )
      return { error: 'invalid_query' };
    const keyword = query.query?.trim();
    const policies = await this.prisma.chinh_sach.findMany({
      where: {
        trangthai: 'DangApDung',
        ngayapdung: { lte: new Date() },
        loaichinhsach: query.category,
        ...(keyword
          ? {
              OR: [
                { tieude: { contains: keyword, mode: 'insensitive' as const } },
                {
                  noidung: { contains: keyword, mode: 'insensitive' as const },
                },
              ],
            }
          : {}),
      },
      orderBy: { ngayapdung: 'desc' },
      take: 3,
      select: {
        machinhsach: true,
        tieude: true,
        noidung: true,
        ngayapdung: true,
      },
    });
    const cancellation =
      query.category === 'HoanHuy'
        ? await this.prisma.chinh_sach_huy.findMany({
            where: {
              trangthai: 'HoatDong',
              ngayapdung: { lte: new Date() },
              OR: [
                { ngayngungapdung: null },
                { ngayngungapdung: { gt: new Date() } },
              ],
            },
            select: {
              machinhsach: true,
              tenchinhsach: true,
              noidungchinhsach: true,
              ngayapdung: true,
              chi_tiet_chinh_sach_huy: {
                select: {
                  sogiotoithieu: true,
                  sogiotoida: true,
                  chophephuy: true,
                  tylehoan: true,
                  tylephihuy: true,
                  ghichu: true,
                },
              },
            },
            orderBy: { ngayapdung: 'desc' },
            take: 3,
          })
        : [];
    return {
      source: 'database',
      sources: [
        ...policies.map((policy) => ({
          id: policy.machinhsach,
          title: policy.tieude,
          url: '/customer/chinh-sach',
          updatedAt: policy.ngayapdung.toISOString(),
        })),
        ...cancellation.map((policy) => ({
          id: policy.machinhsach,
          title: policy.tenchinhsach,
          url: '/customer/chinh-sach',
          updatedAt: policy.ngayapdung.toISOString(),
        })),
      ],
      cancellation: cancellation.map((policy) => ({
        id: policy.machinhsach,
        title: policy.tenchinhsach,
        content: this.clean(policy.noidungchinhsach),
        rules: policy.chi_tiet_chinh_sach_huy,
      })),
      policies: policies.map((policy) => ({
        id: policy.machinhsach,
        title: policy.tieude,
        content: this.clean(policy.noidung).slice(0, 1500),
        effectiveAt: policy.ngayapdung.toISOString(),
      })),
      instruction:
        'Cite the policy title. If none match a keyword, you may retry with query=null. General policy is not verification of a personal refund/transaction.',
    };
  }
  async retrieve(text: string) {
    const now = new Date(),
      input = normalize(text);
    const kind = /hoan|huy|refund|cancel/.test(input)
      ? 'HoanHuy'
      : /dat|ve|book|ticket/.test(input)
        ? 'DatVe'
        : 'DieuKhoanDichVu';
    const [policies, cancellation, routes] = await Promise.all([
      this.prisma.chinh_sach.findMany({
        where: {
          trangthai: 'DangApDung',
          ngayapdung: { lte: now },
          loaichinhsach: kind,
        },
        orderBy: { ngayapdung: 'desc' },
        take: 5,
        select: {
          machinhsach: true,
          tieude: true,
          noidung: true,
          ngayapdung: true,
        },
      }),
      kind === 'HoanHuy'
        ? this.prisma.chinh_sach_huy.findMany({
            where: {
              trangthai: 'HoatDong',
              ngayapdung: { lte: now },
              OR: [{ ngayngungapdung: null }, { ngayngungapdung: { gt: now } }],
            },
            take: 5,
            orderBy: { ngayapdung: 'desc' },
            select: {
              machinhsach: true,
              tenchinhsach: true,
              noidungchinhsach: true,
            },
          })
        : [],
      this.prisma.tuyen_xe.findMany({
        where: { trangthai: 'HoatDong' },
        take: 20,
        orderBy: { matuyenduong: 'asc' },
        select: {
          matuyenduong: true,
          tentuyen: true,
          diemdi: true,
          diemden: true,
        },
      }),
    ]);
    return {
      retrievedAt: now.toISOString(),
      documents: await this.rag?.search(text),
      hotline: process.env.COMPANY_HOTLINE || null,
      policies: policies.map((p) => ({
        id: p.machinhsach,
        title: p.tieude,
        content: this.clean(p.noidung),
        effectiveAt: p.ngayapdung.toISOString(),
      })),
      cancellation: cancellation.map((p) => ({
        id: p.machinhsach,
        title: p.tenchinhsach,
        content: this.clean(p.noidungchinhsach),
      })),
      routes,
      instructions:
        'Routes are a limited catalog, not live seats or prices. Use GET /customer/home/trips for availability. Cancellation policies depend on the actual ticket and departure time; staff must verify. Never infer a refund percentage from generic knowledge.',
    };
  }
  private clean(value: string) {
    return redactHtml(value).slice(0, 2500);
  }
}
function redactHtml(text: string) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
