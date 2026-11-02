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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
