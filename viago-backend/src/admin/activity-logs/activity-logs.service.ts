import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}
}