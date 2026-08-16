import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { BusinessesModule } from "./businesses/businesses.module";
import { FinanceModule } from "./finance/finance.module";
import { HealthController } from "./health.controller";
import { MarketModule } from "./market/market.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    AuthModule,
    BusinessesModule,
    MarketModule,
    FinanceModule,
    AiModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
