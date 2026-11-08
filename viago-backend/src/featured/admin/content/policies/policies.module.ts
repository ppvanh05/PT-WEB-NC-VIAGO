import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AdminPoliciesController } from './policies.controller';
import { AdminPoliciesService } from './policies.service';
import { ContentAccessModule } from '../content-access.module';

@Module({
  imports: [PrismaModule, ContentAccessModule],
  controllers: [AdminPoliciesController],
  providers: [AdminPoliciesService],
})
export class AdminPoliciesModule {}
