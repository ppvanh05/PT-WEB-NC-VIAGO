import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  ValidateIf,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
const trimmed = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
const IsOptional = () =>
  ValidateIf((_object, value: unknown) => value !== undefined);
export class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 10;
  @IsOptional() @IsString() @MaxLength(150) search?: string;
  @IsOptional() @IsIn(['HoatDong', 'DaKhoa']) status?: 'HoatDong' | 'DaKhoa';
  @IsOptional() @IsString() @MaxLength(80) roleId?: string;
  @IsOptional() @IsIn(['Nam', 'Nu', 'Khac']) gender?: 'Nam' | 'Nu' | 'Khac';
}
export class ProfileDto {
  @IsOptional()
  @trimmed()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @IsOptional() @IsIn(['Nam', 'Nu', 'Khac']) gender?: 'Nam' | 'Nu' | 'Khac';
  @IsOptional() @Matches(/^(?:\d{4}-\d{2}-\d{2})?$/) birthday?: string;
  @IsOptional() @trimmed() @IsString() @MaxLength(150) occupation?: string;
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  @Matches(
    /^(https:\/\/[^\s]+|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/assets\/[^\s]+|)$/,
  )
  avatar?: string;
}
export class LoginDto {
  @trimmed() @IsString() @MinLength(3) @MaxLength(254) username: string;
  @IsString() @MinLength(1) @MaxLength(128) password: string;
  @IsOptional() @IsString() @MaxLength(200) verificationToken?: string;
}
export class PasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
export class AdminCustomerPasswordDto {
  @IsString() @MinLength(1) @MaxLength(200) adminPassword: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
}
export class ConfirmPasswordDto {
  @IsString() @MinLength(1) @MaxLength(128) password: string;
}
export class OtpRequestDto {
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsIn(['DangKy', 'QuenMatKhau', 'XacThucHaiLop']) purpose:
    'DangKy' | 'QuenMatKhau' | 'XacThucHaiLop';
}
export class OtpVerifyDto {
  @IsString() @MaxLength(80) challengeId: string;
  @Matches(/^\d{6}$/) code: string;
}
export class RegisterDto extends ProfileDto {
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsString() @MaxLength(200) verificationToken: string;
}
export class ResetPasswordDto {
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsString() @MinLength(8) @MaxLength(128) newPassword: string;
  @IsString() @MaxLength(200) verificationToken: string;
}
export class TwoFactorDto {
  @IsBoolean() enabled: boolean;
  @IsString() @MinLength(1) @MaxLength(128) password: string;
  @IsString() @MaxLength(200) verificationToken: string;
}
export class StatusDto {
  @IsIn(['HoatDong', 'DaKhoa']) status: 'HoatDong' | 'DaKhoa';
  @trimmed() @IsString() @MinLength(3) @MaxLength(500) reason: string;
}
export class CustomerCreateDto {
  @IsOptional() @IsString() @MaxLength(80) memberTierId?: string;
  @trimmed() @IsString() @MinLength(2) @MaxLength(150) name: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsIn(['Nam', 'Nu', 'Khac']) gender?: 'Nam' | 'Nu' | 'Khac';
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday?: string;
  @IsOptional() @trimmed() @IsString() @MaxLength(150) occupation?: string;
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  @Matches(
    /^(https:\/\/[^\s]+|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/assets\/[^\s]+|)$/,
  )
  avatar?: string;
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
}
export class CustomerUpdateDto extends ProfileDto {
  @IsOptional() @Matches(/^0\d{9}$/) phoneNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) memberTierId?: string;
}
export class ReviewDto {
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(5, { each: true })
  scores: number[];
  @IsOptional() @IsString() @MaxLength(500) comment?: string;
}
export class TicketQueryDto extends PageDto {
  @IsOptional()
  @IsIn(['pending', 'upcoming', 'completed', 'reviewed', 'cancelled'])
  ticketStatus?:
    'pending' | 'upcoming' | 'completed' | 'reviewed' | 'cancelled';
  @IsOptional() @IsString() @MaxLength(80) routeId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  @IsOptional() @IsIn(['newest', 'oldest', 'priceAsc', 'priceDesc']) sort:
    'newest' | 'oldest' | 'priceAsc' | 'priceDesc' = 'newest';
}
export class EmployeeCreateDto {
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  @Matches(
    /^(https:\/\/[^\s]+|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/assets\/[^\s]+|)$/,
  )
  avatar?: string;
  @Matches(/^[A-Za-z0-9_.-]{3,50}$/) username: string;
  @trimmed() @IsString() @MinLength(1) @MaxLength(100) firstName: string;
  @trimmed() @IsString() @MinLength(1) @MaxLength(100) lastName: string;
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsIn(['Nam', 'Nu', 'Khac']) gender: 'Nam' | 'Nu' | 'Khac';
  @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate: string;
  @IsString() @MaxLength(80) roleId: string;
  @IsIn(['KhongXacDinhThoiHan', 'XacDinhThoiHan1Nam', 'ThuViec']) contractType:
    'KhongXacDinhThoiHan' | 'XacDinhThoiHan1Nam' | 'ThuViec';
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  permissions: string[];
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}
// PUT replaces editable employee fields; passwords have a separate, audited flow.
export class EmployeeUpdateDto {
  @IsOptional() @Matches(/^[A-Za-z0-9_.-]{3,50}$/) username?: string;
  @IsOptional()
  @IsString()
  @MaxLength(600000)
  @Matches(
    /^(https:\/\/[^\s]+|data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/assets\/[^\s]+|)$/,
  )
  avatar?: string;
  @trimmed() @IsString() @MinLength(1) @MaxLength(100) firstName: string;
  @trimmed() @IsString() @MinLength(1) @MaxLength(100) lastName: string;
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsIn(['Nam', 'Nu', 'Khac']) gender: 'Nam' | 'Nu' | 'Khac';
  @Matches(/^\d{4}-\d{2}-\d{2}$/) birthday: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate: string;
  @IsString() @MaxLength(80) roleId: string;
  @IsIn(['KhongXacDinhThoiHan', 'XacDinhThoiHan1Nam', 'ThuViec']) contractType:
    'KhongXacDinhThoiHan' | 'XacDinhThoiHan1Nam' | 'ThuViec';
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  permissions: string[];
}
export class LogQueryDto extends PageDto {
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsIn(['ThanhCong', 'ThatBai']) result?:
    'ThanhCong' | 'ThatBai';
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate?: string;
  @IsOptional() @IsString() @MaxLength(80) accountId?: string;
}
