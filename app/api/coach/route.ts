import { z } from 'zod';
import { AuthError, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runCoach } from '@/lib/coach-server';
import { clientKey, rateLimit } from '@/lib/rate-limit';
import { jsonError, jsonOk } from '@/lib/api';
import { welcomeReply, JOURNEY_STAGES } from '@/lib/journey';

export async function GET() {
  try {
    const user = await requireUser();
    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    if (messages.length === 0) {
      const w = welcomeReply();
      const created = await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'assistant',
          content: w.message,
          stage: w.stage,
          stageName: JOURNEY_STAGES[w.stage]?.name,
          quickReplies: w.quickReplies ? JSON.stringify(w.quickReplies) : null,
        },
      });
      return jsonOk({
        messages: [
          {
            id: created.id,
            role: created.role,
            content: created.content,
            stage: created.stage,
            stageName: created.stageName,
            quickReplies: (() => {
              try {
                return created.quickReplies ? JSON.parse(created.quickReplies) : undefined;
              } catch {
                return undefined;
              }
            })(),
            timestamp: created.createdAt.getTime(),
          },
        ],
      });
    }

    return jsonOk({
      messages: messages.map((m: {
        id: string;
        role: string;
        content: string;
        stage: number | null;
        stageName: string | null;
        quickReplies: string | null;
        createdAt: Date;
      }) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        stage: m.stage,
        stageName: m.stageName,
        quickReplies: (() => {
          try {
            return m.quickReplies ? JSON.parse(m.quickReplies) : undefined;
          } catch {
            return undefined;
          }
        })(),
        timestamp: m.createdAt.getTime(),
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

const postSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  stage: z.number().int().min(0).max(9).optional(),
  profile: z.record(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(clientKey(request, `coach:${user.id}`), 30, 60_000);
    if (!rl.ok) return jsonError('Juda ko‘p so‘rov', 429);

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return jsonError('Validatsiya xatosi', 400);

    const userMsg = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: 'user',
        content: parsed.data.message,
      },
    });

    const reply = await runCoach({
      message: parsed.data.message,
      stage: parsed.data.stage ?? 0,
      profile: parsed.data.profile,
    });

    const assistant = await prisma.chatMessage.create({
      data: {
        userId: user.id,
        role: 'assistant',
        content: reply.message,
        stage: reply.stage,
        stageName: reply.stageName,
        quickReplies: reply.quickReplies ? JSON.stringify(reply.quickReplies) : null,
      },
    });

    return jsonOk({
      userMessage: {
        id: userMsg.id,
        role: 'user',
        content: userMsg.content,
        timestamp: userMsg.createdAt.getTime(),
      },
      assistantMessage: {
        id: assistant.id,
        role: 'assistant',
        content: assistant.content,
        stage: assistant.stage,
        stageName: assistant.stageName,
        quickReplies: reply.quickReplies,
        timestamp: assistant.createdAt.getTime(),
      },
      provider: reply.provider,
    });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return jsonError(e.message, e.status);
    return jsonError('Server xatosi', 500);
  }
}
