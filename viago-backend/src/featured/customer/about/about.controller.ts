import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CareerApplicationDto,
  ContactRequestDto,
  CV_MAX_SIZE,
  PublicCareersQueryDto,
  PublicFaqQueryDto,
  PublicPoliciesQueryDto,
} from './about.dto';
import type { UploadedCv } from './about.dto';
import { AboutSubmissionGuard } from './about-submission.guard';
import { CustomerCareersService } from './careers/careers.service';
import { CustomerAboutUsService } from './about-us/about-us.service';
import { CustomerContactService } from './contact/contact.service';
import { CustomerFaqService } from './faq/faq.service';
import { CustomerGuideService } from './guide/guide.service';
import {
  CustomerPoliciesService,
  TERM_TYPES,
} from './policies/policies.service';

@Controller('customer/about')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class CustomerAboutController {
  constructor(
    private readonly about: CustomerAboutUsService,
    private readonly contact: CustomerContactService,
    private readonly careers: CustomerCareersService,
    private readonly faq: CustomerFaqService,
    private readonly guide: CustomerGuideService,
    private readonly policies: CustomerPoliciesService,
  ) {}

  @Get(['', 'about-us'])
  overview() {
    return this.about.overview();
  }

  @Get('contact')
  contactInfo() {
    return this.contact.info();
  }

  @Post('contact')
  @UseGuards(AboutSubmissionGuard)
  submitContact(@Body() dto: ContactRequestDto) {
    return this.contact.submit(dto);
  }

  @Get('faq/categories')
  faqCategories() {
    return this.faq.categories();
  }

  @Get('faq')
  findFaqs(@Query() query: PublicFaqQueryDto) {
    return this.faq.findAll(query);
  }

  @Get('faq/:id')
  findFaq(@Param('id') id: string) {
    return this.faq.findOne(id);
  }

  @Get('policies/types')
  policyTypes() {
    return this.policies.types();
  }

  @Get('policies')
  findPolicies(@Query() query: PublicPoliciesQueryDto) {
    return this.policies.findAll(query);
  }

  @Get('policies/:id')
  findPolicy(@Param('id') id: string) {
    return this.policies.findOne(id);
  }

  @Get('terms/types')
  termTypes() {
    return this.policies.types(TERM_TYPES);
  }

  @Get('terms')
  findTerms(@Query() query: PublicPoliciesQueryDto) {
    return this.policies.findAll(query, TERM_TYPES, TERM_TYPES);
  }

  @Get('terms/:id')
  findTerm(@Param('id') id: string) {
    return this.policies.findOne(id, TERM_TYPES);
  }

  @Get('guide')
  findGuides() {
    return this.guide.findAll();
  }

  @Get('guide/:slug')
  findGuide(@Param('slug') slug: string) {
    return this.guide.findOne(slug);
  }

  @Get('careers/options')
  careerOptions() {
    return this.careers.options();
  }

  @Get('careers')
  findJobs(@Query() query: PublicCareersQueryDto) {
    return this.careers.findAll(query);
  }

  @Get('careers/:id')
  findJob(@Param('id') id: string) {
    return this.careers.findOne(id);
  }

  @Post('careers/:id/applications')
  @UseGuards(AboutSubmissionGuard)
  @UseInterceptors(
    FileInterceptor('cv', {
      limits: {
        fileSize: CV_MAX_SIZE,
        files: 1,
        fields: 15,
        fieldSize: 10000,
      },
    }),
  )
  apply(
    @Param('id') id: string,
    @Body() dto: CareerApplicationDto,
    @UploadedFile() cv?: UploadedCv,
  ) {
    return this.careers.apply(id, dto, cv);
  }
}
