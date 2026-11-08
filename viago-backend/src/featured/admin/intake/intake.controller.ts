import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminIntakeService } from './intake.service';
import {
  ApplicationStatusDto,
  ApplicationsQueryDto,
  ContactsQueryDto,
  ContactStatusDto,
} from './intake.dto';
import { IntakeGuard } from './intake.guard';
import type { IntakeRequest } from './intake.guard';
import { AdminJobsService } from './jobs.service';
import { JobDto, JobsQueryDto } from './jobs.dto';
@Controller('admin')
@UseGuards(IntakeGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class AdminIntakeController {
  constructor(
    private readonly service: AdminIntakeService,
    private readonly jobs: AdminJobsService,
  ) {}
  @Get('jobs') listJobs(@Query() q: JobsQueryDto) {
    return this.jobs.list(q);
  }
  @Get('jobs/:id') job(@Param('id') id: string) {
    return this.jobs.detail(id);
  }
  @Post('jobs') createJob(@Body() dto: JobDto, @Req() req: IntakeRequest) {
    return this.jobs.save(dto, req.intakeActor);
  }
  @Patch('jobs/:id') updateJob(
    @Param('id') id: string,
    @Body() dto: JobDto,
    @Req() req: IntakeRequest,
  ) {
    return this.jobs.save(dto, req.intakeActor, id);
  }
  @Get('contacts') contacts(@Query() query: ContactsQueryDto) {
    return this.service.contacts(query);
  }
  @Get('contacts/options') contactOptions() {
    return this.service.contactOptions();
  }
  @Get('contacts/:id') contact(@Param('id') id: string) {
    return this.service.contact(id);
  }
  @Patch('contacts/:id/status') updateContact(
    @Param('id') id: string,
    @Body() dto: ContactStatusDto,
    @Req() req: IntakeRequest,
  ) {
    return this.service.updateContact(id, dto, req.intakeActor);
  }
  @Get('applications') applications(@Query() query: ApplicationsQueryDto) {
    return this.service.applications(query);
  }
  @Get('applications/options') applicationOptions() {
    return this.service.applicationOptions();
  }
  @Get('applications/:id') application(@Param('id') id: string) {
    return this.service.application(id);
  }
  @Get('applications/:id/cv')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  cv(@Param('id') id: string) {
    return this.service.cv(id);
  }
  @Patch('applications/:id/status') updateApplication(
    @Param('id') id: string,
    @Body() dto: ApplicationStatusDto,
    @Req() req: IntakeRequest,
  ) {
    return this.service.updateApplication(id, dto, req.intakeActor);
  }
}
