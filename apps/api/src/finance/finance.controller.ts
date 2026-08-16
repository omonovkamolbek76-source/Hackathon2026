import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FinanceService } from "./finance.service";

class ModelDto {
  @IsNumber() capexSom!: number;
  @IsNumber() monthlyRevenueSom!: number;
  @IsNumber() monthlyOpexSom!: number;
  @IsOptional() @IsNumber() unitPriceSom?: number;
  @IsOptional() @IsNumber() unitCostSom?: number;
}

class CreditDto {
  @IsNumber() amountSom!: number;
  @IsOptional() @IsNumber() annualRatePct?: number;
  @IsOptional() @IsNumber() months?: number;
}

class PlanDto {
  @IsOptional() @IsString() goal?: string;
  @IsOptional() @IsNumber() budgetSom?: number;
}

@Controller("finance")
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Post("model")
  model(@Body() dto: ModelDto) {
    return this.finance.model(dto);
  }

  @Post("credit")
  credit(@Body() dto: CreditDto) {
    return this.finance.creditCalc(dto.amountSom, dto.annualRatePct, dto.months);
  }

  @Post("plan")
  async plan(@Req() req: { user: { id: string } }, @Body() dto: PlanDto) {
    const user = req.user as { id: string };
    void user;
    const model = this.finance.model({
      capexSom: dto.budgetSom ?? 200_000_000,
      monthlyRevenueSom: 40_000_000,
      monthlyOpexSom: 28_000_000,
    });
    return this.finance.plan({
      company: "Business",
      goal: dto.goal,
      budgetSom: dto.budgetSom,
      language: "uz",
      finance: model,
    });
  }
}
