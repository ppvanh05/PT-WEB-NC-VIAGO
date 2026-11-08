import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminIntakeController } from './intake.controller';
import { IntakeGuard } from './intake.guard';
import { AdminIntakeService } from './intake.service';
import { IntakeWorkflowService } from './workflow.service';
import { AdminJobsService } from './jobs.service';
@Module({
  imports: [PrismaModule, AdminAuthModule],
  controllers: [AdminIntakeController],
  providers: [
    IntakeGuard,
    AdminIntakeService,
    IntakeWorkflowService,
    AdminJobsService,
  ],
})
export class AdminIntakeModule {}
