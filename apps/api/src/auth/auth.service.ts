import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException("Email already registered");
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        fullName: dto.fullName,
        language: dto.language ?? "uz",
      },
    });
    const business = await this.prisma.business.create({
      data: {
        ownerId: user.id,
        name: dto.fullName,
        profile: { create: {} },
      },
    });
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: "REGISTER", meta: JSON.stringify({ businessId: business.id }) },
    });
    return this.issue(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: "LOGIN", meta: "{}" },
    });
    return this.issue(user.id, user.role);
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
    });
    if (!row) throw new UnauthorizedException("Invalid refresh token");
    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!user) throw new UnauthorizedException();
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return this.issue(user.id, user.role);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { businesses: { include: { profile: true } } },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  private async issue(userId: string, role: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId, role });
    const refreshToken = randomBytes(32).toString("hex");
    const days = Number(this.config.get("REFRESH_TOKEN_EXPIRES_DAYS") ?? 30);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + days * 86400000),
      },
    });
    return { accessToken, refreshToken };
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
