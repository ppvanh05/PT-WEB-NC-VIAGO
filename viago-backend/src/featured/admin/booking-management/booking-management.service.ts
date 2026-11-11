import { BadRequestException, Injectable } from '@nestjs/common';
import { loai_xe_enum } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export interface GetAllRoutesQuery {
  from: string;
  to: string;
  vehicleType?: string;
  date: string;
}

@Injectable()
export class AdminBookingManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPoints(): Promise<string[]> {
    const points = await this.prisma.diem_don_tra.findMany({
      where: {
        trangthai: 'HoatDong',
        tinhthanh: { not: '' },
      },
      select: { tinhthanh: true },
      distinct: ['tinhthanh'],
      orderBy: { tinhthanh: 'asc' },
    });

    return points.map(({ tinhthanh }) => tinhthanh.trim()).filter(Boolean);
  }

  async getAllVehicleTypes(): Promise<string[]> {
    const vehicleTypes = await this.prisma.loai_xe_thue.findMany({
      where: {
        trangthai: 'HoatDong',
        tenloaixe: { not: '' },
      },
      select: { tenloaixe: true },
      distinct: ['tenloaixe'],
      orderBy: { tenloaixe: 'asc' },
    });

    return vehicleTypes
      .map(({ tenloaixe }) => tenloaixe.trim())
      .filter(Boolean);
  }

  async getAllRoutes({ from, to, vehicleType, date }: GetAllRoutesQuery) {
    const origin = from?.trim();
    const destination = to?.trim();
    const selectedVehicleType = vehicleType?.trim();
    if (!origin || !destination || !date) {
      throw new BadRequestException(
        'Điểm đi, điểm đến và ngày khởi hành là bắt buộc.',
      );
    }
    if (origin === destination) {
      throw new BadRequestException('Điểm đi và điểm đến phải khác nhau.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Ngày khởi hành không hợp lệ.');
    }
    const departureDate = new Date(`${date}T00:00:00.000Z`);
    if (
      Number.isNaN(departureDate.getTime()) ||
      departureDate.toISOString().slice(0, 10) !== date
    ) {
      throw new BadRequestException('Ngày khởi hành không hợp lệ.');
    }

    let vehicleTypeValue: loai_xe_enum | undefined;
    if (selectedVehicleType) {
      const vehicleTypeRecord = await this.prisma.loai_xe_thue.findFirst({
        where: {
          tenloaixe: { equals: selectedVehicleType, mode: 'insensitive' },
          trangthai: 'HoatDong',
        },
        select: { tenloaixe: true },
      });
      if (!vehicleTypeRecord) {
        throw new BadRequestException(
          'Loại xe không tồn tại hoặc đã ngừng hoạt động.',
        );
      }

      const normalizedType = vehicleTypeRecord.tenloaixe
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      const vehicleTypeMap: Array<[string[], loai_xe_enum]> = [
        [['limousine'], loai_xe_enum.Limousine9Cho],
        [['cabin'], loai_xe_enum.Cabin22Cho],
        [['giuong'], loai_xe_enum.GiuongNam34Cho],
      ];
      vehicleTypeValue = vehicleTypeMap.find(([keywords]) =>
        keywords.some((keyword) => normalizedType.includes(keyword)),
      )?.[1];
      if (!vehicleTypeValue) {
        throw new BadRequestException(
          'Loại xe chưa được liên kết với loại xe khách.',
        );
      }
    }

    const now = new Date();
    const schedules = await this.prisma.lich_trinh.findMany({
      where: {
        ngaykhoihanh: departureDate,
        thoigiankhoihanh: { gt: now },
        thoigiandongbanve: { gt: now },
        trangthai: 'DangMoBan',
        tuyen_xe: {
          is: {
            diemdi: { equals: origin, mode: 'insensitive' },
            diemden: { equals: destination, mode: 'insensitive' },
            trangthai: 'HoatDong',
          },
        },
        xe: {
          is: {
            ...(vehicleTypeValue ? { loaixe: vehicleTypeValue } : {}),
            trangthai: 'DangHoatDong',
          },
        },
      },
      include: {
        tuyen_xe: true,
        xe: true,
        lich_trinh_diem: {
          include: { diem_don_tra: true },
          orderBy: { thutu: 'asc' },
        },
        ghe_chuyen: {
          include: { ghe: true },
          orderBy: { ghe: { thutuhienthi: 'asc' } },
        },
      },
      orderBy: { thoigiankhoihanh: 'asc' },
    });

    return schedules.map((schedule) => {
      const seats = schedule.ghe_chuyen.map((seat) => {
        const status =
          seat.trangthaighe === 'DangGiu' &&
          seat.giuchoden &&
          seat.giuchoden <= now
            ? 'Trong'
            : seat.trangthaighe;
        return {
          id: seat.maghechuyen,
          name: seat.ghe.soghe,
          floor: seat.ghe.tang,
          column: seat.ghe.day,
          row: seat.ghe.hang,
          type: seat.ghe.loaighe,
          status,
          price: Number(seat.giaghe),
        };
      });

      return {
        id: schedule.malichtrinh,
        route: {
          id: schedule.tuyen_xe.matuyenduong,
          name: schedule.tuyen_xe.tentuyen,
          from: schedule.tuyen_xe.diemdi,
          to: schedule.tuyen_xe.diemden,
          distance: Number(schedule.tuyen_xe.khoangcach),
          durationMinutes: schedule.tuyen_xe.thoigiandichuyenphut,
          basePrice: Number(schedule.tuyen_xe.giacoso),
          tripsPerDay: schedule.tuyen_xe.sochuyenmoingay,
          pickupPoints: schedule.lich_trinh_diem
            .filter((point) => point.loaidiemtuyen === 'Don')
            .map(({ diem_don_tra: point }) => ({
              id: point.madiem,
              name: point.tendiem,
              address: point.diachi,
              city: point.tinhthanh,
            })),
          dropoffPoints: schedule.lich_trinh_diem
            .filter((point) => point.loaidiemtuyen === 'Tra')
            .map(({ diem_don_tra: point }) => ({
              id: point.madiem,
              name: point.tendiem,
              address: point.diachi,
              city: point.tinhthanh,
            })),
        },
        vehicle: {
          id: schedule.xe.maxe,
          name: schedule.xe.tenxe,
          licensePlate: schedule.xe.biensoxe,
          type: schedule.xe.loaixe,
        },
        departureDate: date,
        departureTime: schedule.giokhoihanh.toISOString().slice(11, 16),
        departureAt: schedule.thoigiankhoihanh.toISOString(),
        arrivalAt: schedule.thoigiandendukien.toISOString(),
        status: schedule.trangthai,
        price: Number(schedule.giavecoso),
        seatCount: seats.length,
        availableSeatCount: seats.filter((seat) => seat.status === 'Trong')
          .length,
        seats,
      };
    });
  }

  async getCustomerInfoByPhone(phone: string) {
    const rawPhone = phone?.trim();
    if (!rawPhone) {
      throw new BadRequestException('Số điện thoại không được để trống.');
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      throw new BadRequestException('Số điện thoại không hợp lệ.');
    }

    const customer = await this.prisma.khach_hang.findFirst({
      where: {
        OR: [
          { sodienthoai: cleanPhone },
          { sodienthoai: rawPhone },
        ],
      },
      include: {
        don_hang: {
          orderBy: { thoigiandat: 'desc' },
          take: 1,
          include: {
            diem_don_tra_don_hang_madiemdonTodiem_don_tra: {
              select: { tendiem: true, tinhthanh: true },
            },
            diem_don_tra_don_hang_madiemtraTodiem_don_tra: {
              select: { tendiem: true, tinhthanh: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return null;
    }

    const latestOrder = customer.don_hang[0];

    return {
      makhachhang: customer.makhachhang,
      hotenkhachhang: customer.hotenkhachhang,
      sodienthoai: customer.sodienthoai,
      email: customer.email,
      diemtichluy: customer.diemtichluy,
      diemdon:
        latestOrder?.diem_don_tra_don_hang_madiemdonTodiem_don_tra?.tendiem ||
        latestOrder?.madiemdon ||
        null,
      diemtra:
        latestOrder?.diem_don_tra_don_hang_madiemtraTodiem_don_tra?.tendiem ||
        latestOrder?.madiemtra ||
        null,
    };
  }

  async getAllRoutesName(): Promise<string[]> {
    const routes = await this.prisma.tuyen_xe.findMany({
      where: {
        tentuyen: { not: '' },
      },
      select: { tentuyen: true },
      distinct: ['tentuyen'],
      orderBy: { tentuyen: 'asc' },
    });

    return routes.map((r) => r.tentuyen.trim()).filter(Boolean);
  }

  async getAllTickets() {
    const tickets = await this.prisma.ve_xe.findMany({
      orderBy: {
        thoigiantao: 'desc',
      },
      select: {
        mave: true,
        madonhang: true,
        hotenhanhkhach: true,
        sodienthoaihanhkhach: true,
        giave: true,
        trangthaive: true,
        thoigiantao: true,
        don_hang: {
          select: {
            madonhang: true,
            hotennguoidat: true,
            sodienthoainguoidat: true,
            nguondat: true,
            trangthaidonhang: true,
            thoigiandat: true,
          },
        },
        ghe_chuyen: {
          select: {
            trangthaighe: true,
            ghe: {
              select: {
                soghe: true,
              },
            },
            lich_trinh: {
              select: {
                malichtrinh: true,
                ngaykhoihanh: true,
                giokhoihanh: true,
                tuyen_xe: {
                  select: {
                    tentuyen: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return tickets.map((ve) => {
      let trangThaiVe: 'GiuCho' | 'ChoKhoiHanh' | 'DaHoanThanh' | 'DaHuy';
      const rawVeStatus = String(ve.trangthaive);
      const orderStatus = ve.don_hang?.trangthaidonhang;
      const seatStatus = ve.ghe_chuyen?.trangthaighe;

      if (rawVeStatus === 'GiuCho') {
        trangThaiVe = 'GiuCho';
      } else if (
        rawVeStatus === 'DaHuy' ||
        orderStatus === 'DaHuy' ||
        orderStatus === 'HetHanThanhToan'
      ) {
        trangThaiVe = 'DaHuy';
      } else if (rawVeStatus === 'DaHoanThanh') {
        trangThaiVe = 'DaHoanThanh';
      } else if (
        orderStatus === 'ChoThanhToanOnline' ||
        orderStatus === 'ChoThanhToanTrucTiep' ||
        seatStatus === 'DangGiu'
      ) {
        trangThaiVe = 'GiuCho';
      } else {
        trangThaiVe = 'ChoKhoiHanh';
      }

      const ngayKhoiHanh = ve.ghe_chuyen?.lich_trinh?.ngaykhoihanh
        ? ve.ghe_chuyen.lich_trinh.ngaykhoihanh.toISOString().slice(0, 10)
        : '';
      const gioKhoiHanh = ve.ghe_chuyen?.lich_trinh?.giokhoihanh
        ? ve.ghe_chuyen.lich_trinh.giokhoihanh.toISOString().slice(11, 16)
        : '';

      return {
        maVe: ve.mave,
        maDonHang: ve.madonhang,
        maLichTrinh: ve.ghe_chuyen?.lich_trinh?.malichtrinh || '',
        hoTenNguoiDi: ve.hotenhanhkhach || ve.don_hang?.hotennguoidat || '',
        sdtNguoiDi:
          ve.sodienthoaihanhkhach || ve.don_hang?.sodienthoainguoidat || '',
        tenTuyenXe: ve.ghe_chuyen?.lich_trinh?.tuyen_xe?.tentuyen || '',
        ngayKhoiHanh,
        gioKhoiHanh,
        soGhe: ve.ghe_chuyen?.ghe?.soghe || '',
        giaVe: Number(ve.giave),
        nguonDat: ve.don_hang?.nguondat || 'TaiQuay',
        trangThaiVe,
        trangThaiDonHang: orderStatus || 'DaThanhToan',
        thoiGianDat: ve.don_hang?.thoigiandat
          ? ve.don_hang.thoigiandat.toISOString()
          : ve.thoigiantao.toISOString(),
      };
    });
  }
}
