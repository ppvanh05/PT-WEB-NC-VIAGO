import { Module } from '@nestjs/common';
import { CustomerProfileController } from './profile.controller';
import { CustomerProfileService } from './profile.service';

@Module({
  controllers: [CustomerProfileController],
  providers: [CustomerProfileService],
})
export class CustomerProfileModule {}