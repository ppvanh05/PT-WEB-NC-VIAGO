import { Module } from '@nestjs/common';
import { WeatherIntegrationService } from './weather.service';

@Module({
  providers: [WeatherIntegrationService],
  exports: [WeatherIntegrationService],
})
export class WeatherIntegrationModule {}