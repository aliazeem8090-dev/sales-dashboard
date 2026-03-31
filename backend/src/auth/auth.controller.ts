// backend/src/auth/auth.controller.ts
import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RepsService } from '../reps/reps.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private repsService: RepsService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: any) {
    if (req.user.role === 'REP' && !req.user.rep) {
      await this.repsService.create({ userId: req.user.id });
      const refreshed = await this.usersService.findByEmail(req.user.email);
      const { password, ...safeUser } = refreshed!;
      return this.authService.login(safeUser);
    }
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() body: { name: string; email: string; password: string; role?: string }) {
    const role = (body.role as any) || 'REP';
    const user = await this.usersService.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role,
    });

    if (role === 'REP') {
      await this.repsService.create({ userId: user.id });
    }

    const fullUser = await this.usersService.findByEmail(user.email);
    const { password, ...safeUser } = fullUser!;
    return this.authService.login(safeUser);
  }
}
