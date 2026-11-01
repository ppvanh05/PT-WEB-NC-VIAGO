import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { CustomerModule } from './customer/customer.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    PrismaModule,
    AdminModule,
    CustomerModule,
    IntegrationsModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
