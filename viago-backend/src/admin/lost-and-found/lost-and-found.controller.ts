import { Controller } from '@nestjs/common';
import { AdminLostAndFoundService } from './lost-and-found.service';

@Controller('admin/lost-and-found')
export class AdminLostAndFoundController {
  constructor(private readonly service: AdminLostAndFoundService) {}
}