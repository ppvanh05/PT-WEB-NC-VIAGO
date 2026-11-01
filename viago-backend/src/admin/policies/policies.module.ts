import { Module } from '@nestjs/common';
import { AdminPoliciesController } from './policies.controller';
import { AdminPoliciesService } from './policies.service';

@Module({
  controllers: [AdminPoliciesController],
  providers: [AdminPoliciesService],
})
export class AdminPoliciesModule {}