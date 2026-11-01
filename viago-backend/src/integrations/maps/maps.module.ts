import { Module } from '@nestjs/common';
import { MapsIntegrationService } from './maps.service';

@Module({
  providers: [MapsIntegrationService],
  exports: [MapsIntegrationService],
})
export class MapsIntegrationModule {}