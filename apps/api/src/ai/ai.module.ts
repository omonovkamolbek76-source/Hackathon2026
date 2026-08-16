import { Module } from "@nestjs/common";
import { FinanceModule } from "../finance/finance.module";
import { MarketModule } from "../market/market.module";
import { AiController } from "./ai.controller";
import { OrchestratorService } from "./orchestrator.service";
import { ToolsService } from "./tools.service";

@Module({
  imports: [MarketModule, FinanceModule],
  controllers: [AiController],
  providers: [ToolsService, OrchestratorService],
})
export class AiModule {}
