import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SharedModule } from './shared/shared.module';
import { AdminPoliciesModule } from './featured/admin/content/policies/policies.module';
import { AdminNewsModule } from './featured/admin/content/news/news.module';
import { AdminPromotionsModule } from './featured/admin/content/promotions/promotions.module';
import { CustomerAboutModule } from './featured/customer/about/about.module';
import { CustomerNewsModule } from './featured/customer/news/news.module';
import { CustomerHomeModule } from './featured/customer/home/home.module';
import { CustomerChatbotModule } from './featured/customer/chatbot/chatbot.module';
import { AdminCustomerSupportModule } from './featured/admin/customers/support/support.module';
import { AdminAuthModule } from './featured/admin/auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    IntegrationsModule,
    SharedModule,
    AdminPoliciesModule,
    AdminNewsModule,
    AdminPromotionsModule,
    CustomerAboutModule,
    CustomerNewsModule,
    CustomerHomeModule,
    CustomerChatbotModule,
    AdminCustomerSupportModule,
    AdminAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
