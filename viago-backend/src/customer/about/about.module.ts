import { Module } from '@nestjs/common';
import { CustomerAboutController } from './about.controller';
import { CustomerAboutService } from './about.service';

@Module({
  controllers: [CustomerAboutController],
  providers: [CustomerAboutService],
})
export class CustomerAboutModule {}