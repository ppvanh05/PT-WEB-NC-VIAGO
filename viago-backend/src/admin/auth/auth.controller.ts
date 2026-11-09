import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
