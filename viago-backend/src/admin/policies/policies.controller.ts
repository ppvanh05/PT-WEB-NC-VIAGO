import { Controller } from '@nestjs/common';
import { AdminPoliciesService } from './policies.service';

@Controller('admin/policies')
export class AdminPoliciesController {
  constructor(private readonly service: AdminPoliciesService) {}
}