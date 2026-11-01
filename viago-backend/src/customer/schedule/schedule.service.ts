import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerScheduleService {
  constructor(private readonly prisma: PrismaService) {}
}