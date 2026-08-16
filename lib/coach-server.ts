import OpenAI from 'openai';
import { coachRespond, welcomeReply, isSensitiveRequest, sensitiveRefusal, JOURNEY_STAGES } from '@/lib/journey';

const SYSTEM_PROMPT = `Siz — TadbirkorAI: O‘zbekistonda kichik tadbirkorlarga moliyaviy maslahatchi va biznes murabbiysisiz.
Maqsad: odamni "g‘oya bor" holatidan "biznes ishlayapti" holatiga bosqichma-bosqich olib borish.
Qoidalar:
- Bitta javobda bitta savol.
- 2–4 gap, keyin aniq keyingi qadam.
- Kredit ma’qullanishini yoki aniq foizni kafolatlamang.
- Karta raqami, CVV, OTP, bank parolini hech qachon so‘ramang.
- Standart til: o‘zbek lotin; foydalanuvchi ruscha yozsa — ruscha javob bering.
- Javob oxirida JSON metadata qo‘shing (faqat oxirgi qatorda):
{"stage":N,"quick_replies":["...","..."]}`;

export type CoachRequest = {
  message: string;
  stage: number;
  profile?: Record<string, string>;
};

export type CoachResponse = {
  message: string;
  stage: number;
  stageName?: string;
  quickReplies?: string[];
  provider: 'openai' | 'local';
};

function parseMeta(raw: string): { text: string; stage?: number; quickReplies?: string[] } {
  const lines = raw.trim().split('\n');
  const last = lines[lines.length - 1]?.trim() || '';
  if (last.startsWith('{') && last.endsWith('}')) {
    try {
      const meta = JSON.parse(last) as { stage?: number; quick_replies?: string[] };
      return {
        text: lines.slice(0, -1).join('\n').trim(),
        stage: typeof meta.stage === 'number' ? meta.stage : undefined,
        quickReplies: Array.isArray(meta.quick_replies) ? meta.quick_replies.slice(0, 6) : undefined,
      };
    } catch {
      return { text: raw.trim() };
    }
  }
  return { text: raw.trim() };
}

export async function runCoach(req: CoachRequest): Promise<CoachResponse> {
  if (isSensitiveRequest(req.message)) {
    const r = sensitiveRefusal();
    return {
      message: r.message,
      stage: r.stage,
      stageName: JOURNEY_STAGES[r.stage]?.name,
      quickReplies: r.quickReplies,
      provider: 'local',
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const client = new OpenAI({ apiKey });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Joriy bosqich: ${req.stage}. Profil: ${JSON.stringify(req.profile || {})}. Xabar: ${req.message}`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content || '';
      const parsed = parseMeta(raw);
      const stage = parsed.stage ?? req.stage;
      return {
        message: parsed.text || raw,
        stage,
        stageName: JOURNEY_STAGES[stage]?.name,
        quickReplies: parsed.quickReplies,
        provider: 'openai',
      };
    } catch {
      // fall through to local coach
    }
  }

  if (!req.message.trim()) {
    const w = welcomeReply();
    return {
      message: w.message,
      stage: w.stage,
      stageName: JOURNEY_STAGES[w.stage]?.name,
      quickReplies: w.quickReplies,
      provider: 'local',
    };
  }

  const local = coachRespond(req.message, req.stage, req.profile || {});
  return {
    message: local.message,
    stage: local.stage,
    stageName: JOURNEY_STAGES[local.stage]?.name,
    quickReplies: local.quickReplies,
    provider: 'local',
  };
}
