// backend/src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { Benchmark, ProfileType } from '../benchmarks/benchmark.entity';

const PROFILE_GUIDANCE: Record<string, string> = {
  MERN: 'Emphasize full-stack JavaScript expertise. Look for React/Node.js/MongoDB examples, frontend-backend integration, REST API design, and performance optimization. Penalize if no JS-specific examples are included.',
  LARAVEL: 'Focus on PHP/Laravel backend expertise. Look for API development, database optimization, Eloquent ORM usage, and backend architecture examples. Penalize generic PHP mentions without Laravel specifics.',
  AI_ML: 'Emphasize machine learning, Python, data science, and model deployment examples. Look for specific algorithms, datasets, or tools (TensorFlow, PyTorch, scikit-learn). Penalize vague "AI experience" claims without specifics.',
  WORDPRESS: 'Focus on CMS expertise, plugin/theme development, WooCommerce, and e-commerce integrations. Look for specific WordPress project examples. Penalize if no CMS-specific customization is mentioned.',
  GENERAL: 'Apply balanced scoring across all criteria.',
};

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(Benchmark)
    private benchmarksRepository: Repository<Benchmark>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async reviewProposal(proposalText: string, profileType: string, jobDescription?: string): Promise<any> {
    const benchmark = await this.benchmarksRepository.findOne({
      where: { profileType: profileType as ProfileType },
    });

    const weights = benchmark?.scoringWeights || {
      hook: 20, personalization: 15, painPoints: 15,
      technicalCredibility: 15, portfolio: 10, cta: 10, toneBrevity: 10, profileAlignment: 5,
    };

    const profileGuidance = PROFILE_GUIDANCE[profileType] || PROFILE_GUIDANCE.GENERAL;

    const prompt = `You are an expert Upwork proposal reviewer for a ${profileType} specialist.

Profile-specific guidance: ${profileGuidance}

Scoring weights (out of 100 total):
- Hook: ${weights.hook} pts
- Personalization: ${weights.personalization} pts
- Pain Points: ${weights.painPoints} pts
- Technical Credibility: ${weights.technicalCredibility} pts
- Portfolio Relevance: ${weights.portfolio} pts
- CTA Strength: ${weights.cta} pts
- Tone & Brevity: ${weights.toneBrevity} pts
- Profile Alignment: ${weights.profileAlignment} pts

${jobDescription ? `Job Description:\n${jobDescription}\n` : ''}

Proposal to review:
${proposalText}

Return JSON only (no markdown):
{
  "overallScore": number,
  "categoryScores": {
    "hook": number,
    "personalization": number,
    "painPoints": number,
    "technicalCredibility": number,
    "portfolio": number,
    "cta": number,
    "toneBrevity": number,
    "profileAlignment": number
  },
  "missingElements": string[],
  "suggestions": string[],
  "improvedHook": string,
  "rewrittenVersion": string,
  "whyItMayNotConvert": string
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = (response.choices[0].message.content ?? '').trim();
    const jsonStart = content.indexOf('{');
    const jsonStr = jsonStart >= 0 ? content.slice(jsonStart) : content;
    return JSON.parse(jsonStr);
  }

  async getChatResponse(message: string, context: any): Promise<string> {
    const isAdmin = context?.role === 'ADMIN' || context?.role === 'MANAGER';

    const systemPrompt = isAdmin
      ? `You are an AI analytics assistant for a sales manager overseeing an Upwork outreach team.
The team specializes in MERN, Laravel, AI/ML Python, and WordPress services.
You have access to team performance data. Be analytical, diagnostic, and actionable.
Team context: ${JSON.stringify(context)}`
      : `You are an AI assistant for an Upwork sales rep.
Your rep's profile: ${JSON.stringify(context?.profile || {})}
Their recent stats: ${JSON.stringify(context?.stats || {})}
Help with proposal writing, job analysis, profile optimization, and objection handling.
Be specific, concise, and encouraging. Always relate advice to their actual niche and numbers.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content ?? '';
  }

  async generateWeeklySummary(repName: string, stats: any): Promise<string> {
    const prompt = `Write a brief weekly performance summary (3-4 sentences) for a sales rep named ${repName}.
Stats: ${JSON.stringify(stats)}
Tone: direct, coaching-oriented. Highlight 1 win and 1 area to improve. End with one specific action item.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
    });

    return response.choices[0].message.content ?? '';
  }
}
