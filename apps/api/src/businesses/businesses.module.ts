import { Module } from "@nestjs/common";
import { FinanceModule } from "../finance/finance.module";
import { MarketModule } from "../market/market.module";
import { BusinessesController } from "./businesses.controller";
import { BusinessesService } from "./businesses.service";

@Module({
  imports: [FinanceModule, MarketModule],
  controllers: [BusinessesController],
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
