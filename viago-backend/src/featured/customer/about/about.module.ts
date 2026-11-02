import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CustomerAboutController } from './about.controller';
import { AboutSubmissionGuard } from './about-submission.guard';
import { CustomerCareersService } from './careers/careers.service';
import { CvStorageService } from './careers/cv-storage.service';
import { CustomerAboutUsService } from './about-us/about-us.service';
import { CustomerContactService } from './contact/contact.service';
import { CustomerFaqService } from './faq/faq.service';
import { CustomerGuideService } from './guide/guide.service';
import { CustomerPoliciesService } from './policies/policies.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerAboutController],
  providers: [
    AboutSubmissionGuard,
    CustomerCareersService,
    CvStorageService,
    CustomerAboutUsService,
    CustomerContactService,
    CustomerFaqService,
    CustomerGuideService,
    CustomerPoliciesService,
  ],
})
export class CustomerAboutModule {}
