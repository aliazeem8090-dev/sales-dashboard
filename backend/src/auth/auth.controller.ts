// backend/src/auth/auth.controller.ts
import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RepsService } from '../reps/reps.service';
import { LinkedInAgentsService } from '../linkedin-agents/linkedin-agents.service';
import { FreelancerAgentsService } from '../freelancer-agents/freelancer-agents.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private repsService: RepsService,
    private agentsService: LinkedInAgentsService,
    private freelancerAgentsService: FreelancerAgentsService,
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

    if (req.user.role === 'LINKEDIN_AGENT') {
      let agent = await this.agentsService.findByUserId(req.user.id);
      if (!agent) {
        agent = await this.agentsService.create({ userId: req.user.id });
      }
      const result = await this.authService.login(req.user);
      result.user.agentId = agent.id;
      return result;
    }

    if (req.user.role === 'FREELANCER_AGENT') {
      let agent = await this.freelancerAgentsService.findByUserId(req.user.id);
      if (!agent) {
        agent = await this.freelancerAgentsService.create({ userId: req.user.id });
      }
      const result = await this.authService.login(req.user);
      result.user.freelancerAgentId = agent.id;
      return result;
    }

    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() body: { name: string; email: string; password: string; role?: string; companyId?: string }) {
    const role = (body.role as any) || 'REP';
    const user = await this.usersService.create({
      name: body.name,
      email: body.email,
      password: body.password,
      role,
      companyId: body.companyId || 'company-1',
    });

    if (role === 'REP') {
      await this.repsService.create({ userId: user.id });
    }

    if (role === 'LINKEDIN_AGENT') {
      await this.agentsService.create({ userId: user.id });
    }

    if (role === 'FREELANCER_AGENT') {
      await this.freelancerAgentsService.create({ userId: user.id });
    }

    const fullUser = await this.usersService.findByEmail(user.email);
    const { password, ...safeUser } = fullUser!;
    const result = await this.authService.login(safeUser);

    if (role === 'LINKEDIN_AGENT') {
      const agent = await this.agentsService.findByUserId(user.id);
      result.user.agentId = agent?.id || null;
    }

    if (role === 'FREELANCER_AGENT') {
      const agent = await this.freelancerAgentsService.findByUserId(user.id);
      result.user.freelancerAgentId = agent?.id || null;
    }

    return result;
  }
}
