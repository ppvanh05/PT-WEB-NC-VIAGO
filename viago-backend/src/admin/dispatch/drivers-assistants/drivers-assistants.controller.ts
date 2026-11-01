import { Controller } from '@nestjs/common';
import { AdminDriversAssistantsService } from './drivers-assistants.service';

@Controller('admin/dispatch/drivers-assistants')
export class AdminDriversAssistantsController {
  constructor(private readonly service: AdminDriversAssistantsService) {}
}