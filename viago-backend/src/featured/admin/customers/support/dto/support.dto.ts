import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsArray,
  ArrayMaxSize,
  Matches,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class WorkspaceQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.split(',').filter(Boolean)
      : (value ?? []),
  )
  @IsArray()
  @ArrayMaxSize(100)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/, { each: true })
  ids: string[] = [];
}

export class InboxQueryDto {
  @IsIn(['ALL', 'QUEUED', 'MINE', 'ASSIGNED', 'RESOLVED', 'CLOSED']) status =
    'QUEUED';
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;
  @IsOptional()
  @IsIn(['ThanhToan', 'DatVe', 'HoanTien', 'KhieuNai', 'AnToan', 'Khac'])
  category?: string;
  @IsOptional()
  @IsIn(['Thap', 'TrungBinh', 'Cao', 'KhanCap'])
  priority?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
}
export class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  before?: number;
}
