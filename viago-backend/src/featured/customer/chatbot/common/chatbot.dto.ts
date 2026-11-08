import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  IsOptional,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateConversationDto {
  @IsIn(['vi', 'en']) language = 'vi';
}
export class SupportMessageDto {
  @IsUUID() clientMessageId: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text: string;
}
export class StaffMessageDto extends SupportMessageDto {
  @IsIn(['original', 'customer']) translate: string = 'original';
}
export class SupportEventsDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(2147483647) after = 0;
}
export class ResolveConversationDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  resolution: string;
}
export class DraftReplyDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  instruction?: string;
}
export class TranslateMessageDto {
  @IsString() @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/) messageId: string;
  @IsIn(['vi', 'en']) language: string;
}

export class ReassignConversationDto {
  @IsString() @MinLength(1) @MaxLength(100) staffId: string;
}

export class KnowledgeDocumentDto {
  @IsString() @MinLength(3) @MaxLength(300) title: string;
  @IsString() @Matches(/^tai-lieu:[a-zA-Z0-9_-]{1,100}$/) source: string;
  @IsOptional()
  @IsString()
  @Matches(/^\/customer\/[a-zA-Z0-9\-/_#?=&%]*$/)
  @MaxLength(1000)
  url?: string;
  @IsString() @MinLength(20) @MaxLength(40000) content: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) category?: string;
}
