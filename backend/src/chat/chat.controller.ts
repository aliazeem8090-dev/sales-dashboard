// backend/src/chat/chat.controller.ts
import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('review-proposal')
  async reviewProposal(
    @Body() body: { proposalText: string; profileType: string; jobDescription?: string },
  ) {
    return this.chatService.reviewProposal(body.proposalText, body.profileType, body.jobDescription);
  }

  @Post('message')
  async sendMessage(@Body() body: { message: string; context: any }) {
    try {
      return {
        response: await this.chatService.getChatResponse(body.message, body.context),
      };
    } catch (err: any) {
      const message = err?.error?.message || err?.message || 'OpenAI request failed';
      throw new HttpException({ message }, HttpStatus.BAD_GATEWAY);
    }
  }

  @Post('weekly-summary')
  async weeklySummary(@Body() body: { repName: string; stats: any }) {
    return {
      summary: await this.chatService.generateWeeklySummary(body.repName, body.stats),
    };
  }
}
