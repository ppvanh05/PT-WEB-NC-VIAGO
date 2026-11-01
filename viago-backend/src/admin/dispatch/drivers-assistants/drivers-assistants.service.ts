import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminDriversAssistantsService {
  constructor(private readonly prisma: PrismaService) {}
}