import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AdminPoliciesService } from './policies.service';
import {
  CreatePolicyDto,
  ListPoliciesDto,
  UpdatePolicyDto,
  UpdatePolicyStatusDto,
} from './policies.dto';

@Controller('admin/policies')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class AdminPoliciesController {
  constructor(private readonly service: AdminPoliciesService) {}

  @Get()
  findAll(@Query() query: ListPoliciesDto) {
    return this.service.findAll(query);
  }

  @Get('statistics')
  statistics() {
    return this.service.statistics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePolicyDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePolicyStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePolicyDto) {
    return this.service.update(id, dto);
  }
}
