import { Module } from '@nestjs/common';
import { PaymentIntegrationModule } from './payment/payment.module';
import { ChatbotIntegrationModule } from './chatbot/chatbot.module';
import { MapsIntegrationModule } from './maps/maps.module';
import { WeatherIntegrationModule } from './weather/weather.module';

@Module({
  imports: [
    PaymentIntegrationModule,
    ChatbotIntegrationModule,
    MapsIntegrationModule,
    WeatherIntegrationModule,
  ],
  exports: [
    PaymentIntegrationModule,
    ChatbotIntegrationModule,
    MapsIntegrationModule,
    WeatherIntegrationModule,
  ],
})
export class IntegrationsModule {}
