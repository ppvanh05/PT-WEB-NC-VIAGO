import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
export class AdminLoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  username: string;
  @IsString() @MinLength(1) @MaxLength(200) password: string;
}
