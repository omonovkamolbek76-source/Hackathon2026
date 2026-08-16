import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MarketService } from "./market.service";

@Controller("market")
@UseGuards(JwtAuthGuard)
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get("search")
  search(@Query("q") q?: string, @Query("region") region?: string) {
    return this.market.search(q, region);
  }

  @Get("compare")
  compare(@Query("product") product: string, @Query("region") region?: string) {
    return this.market.compare(product, region);
  }

  @Get("demand")
  demand(@Query("product") product?: string, @Query("region") region?: string) {
    return this.market.demand(product, region);
  }
}
