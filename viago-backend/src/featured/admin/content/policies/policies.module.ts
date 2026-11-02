import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AdminPoliciesController } from './policies.controller';
import { AdminPoliciesService } from './policies.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPoliciesController],
  providers: [AdminPoliciesService],
})
export class AdminPoliciesModule {}
