import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles, RolesGuard } from "../auth/roles";
import { PrismaService } from "../prisma/prisma.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("overview")
  async overview() {
    const [users, businesses, decisions, tasks] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.aiDecisionLog.count(),
      this.prisma.aiTask.count(),
    ]);
    const cost = await this.prisma.aiDecisionLog.aggregate({ _sum: { costEstimate: true } });
    return {
      users,
      businesses,
      decisions,
      tasks,
      dailyAiCost: cost._sum.costEstimate ?? 0,
    };
  }

  @Get("users")
  users() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  @Get("decisions")
  decisions() {
    return this.prisma.aiDecisionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        agentName: true,
        taskType: true,
        confidence: true,
        latencyMs: true,
        costEstimate: true,
        createdAt: true,
        helpful: true,
      },
    });
  }

  @Get("health")
  async health() {
    const latest = await this.prisma.aiDecisionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const avgLatency =
      latest.reduce((s, d) => s + d.latencyMs, 0) / Math.max(latest.length, 1);
    return { ok: true, avgLatencyMs: Math.round(avgLatency), recent: latest.length };
  }
}
