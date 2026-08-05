import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type ProfileType = 'MERN' | 'LARAVEL' | 'AI_ML' | 'WORDPRESS' | 'GENERAL';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const profileGuidance: Record<ProfileType, string> = {
  MERN: 'Emphasize full-stack JavaScript expertise. Look for React/Node.js/MongoDB examples, frontend-backend integration, REST API design, and performance optimization. Penalize if no JS-specific examples are included.',
  LARAVEL: 'Focus on PHP/Laravel backend expertise. Look for API development, database optimization, Eloquent ORM usage, and backend architecture examples. Penalize generic PHP mentions without Laravel specifics.',
  AI_ML: 'Emphasize machine learning, Python, data science, and model deployment examples. Look for specific algorithms, datasets, or tools (TensorFlow, PyTorch, scikit-learn). Penalize vague "AI experience" claims without specifics.',
  WORDPRESS: 'Focus on CMS expertise, plugin/theme development, WooCommerce, and e-commerce integrations. Look for specific WordPress project examples. Penalize if no CMS-specific customization is mentioned.',
  GENERAL: 'Apply balanced scoring across all criteria.',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function callOpenAI(messages: Array<{ role: 'system' | 'user'; content: string }>, temperature: number) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${details}`);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ message: 'Missing authorization header.' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const body = await req.json();

    if (body.action === 'review-proposal') {
      const profileType = (body.profileType || 'GENERAL') as ProfileType;
      const { data: benchmark } = await supabase
        .from('benchmark')
        .select('scoringWeights')
        .eq('profileType', profileType)
        .maybeSingle();

      const weights = benchmark?.scoringWeights || {
        hook: 20,
        personalization: 15,
        painPoints: 15,
        technicalCredibility: 15,
        portfolio: 10,
        cta: 10,
        toneBrevity: 10,
        profileAlignment: 5,
      };

      const prompt = `You are an expert Upwork proposal reviewer for a ${profileType} specialist.

Profile-specific guidance: ${profileGuidance[profileType] || profileGuidance.GENERAL}

Scoring weights (out of 100 total):
- Hook: ${weights.hook} pts
- Personalization: ${weights.personalization} pts
- Pain Points: ${weights.painPoints} pts
- Technical Credibility: ${weights.technicalCredibility} pts
- Portfolio Relevance: ${weights.portfolio} pts
- CTA Strength: ${weights.cta} pts
- Tone & Brevity: ${weights.toneBrevity} pts
- Profile Alignment: ${weights.profileAlignment} pts

${body.jobDescription ? `Job Description:\n${body.jobDescription}\n` : ''}

Proposal to review:
${body.proposalText}

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

      const content = await callOpenAI([{ role: 'user', content: prompt }], 0.3);
      const jsonStart = content.indexOf('{');
      return jsonResponse(JSON.parse(jsonStart >= 0 ? content.slice(jsonStart) : content));
    }

    if (body.action === 'message') {
      const isAdmin = body.context?.role === 'ADMIN' || body.context?.role === 'MANAGER';
      const systemPrompt = isAdmin
        ? `You are an AI analytics assistant for a sales manager overseeing an Upwork outreach team.
The team specializes in MERN, Laravel, AI/ML Python, and WordPress services.
You have access to team performance data. Be analytical, diagnostic, and actionable.
Team context: ${JSON.stringify(body.context)}`
        : `You are an AI assistant for an Upwork sales rep.
Their context: ${JSON.stringify(body.context || {})}
Help with proposal writing, job analysis, profile optimization, and objection handling.
Be specific, concise, and encouraging.`;

      const content = await callOpenAI(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: body.message },
        ],
        0.7,
      );

      return jsonResponse({ response: content });
    }

    if (body.action === 'weekly-summary') {
      const prompt = `Write a brief weekly performance summary (3-4 sentences) for a sales rep named ${body.repName}.
Stats: ${JSON.stringify(body.stats)}
Tone: direct, coaching-oriented. Highlight 1 win and 1 area to improve. End with one specific action item.`;

      const content = await callOpenAI([{ role: 'user', content: prompt }], 0.6);
      return jsonResponse({ summary: content });
    }

    return jsonResponse({ message: 'Unknown AI action.' }, 400);
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : 'AI function failed.' }, 500);
  }
});
