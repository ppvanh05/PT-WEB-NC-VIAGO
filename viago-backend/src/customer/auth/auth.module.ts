import { Module } from '@nestjs/common';
import { CustomerAuthController } from './auth.controller';
import { CustomerAuthService } from './auth.service';

@Module({
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService],
})
export class CustomerAuthModule {}