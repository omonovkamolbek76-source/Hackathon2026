import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BusinessesService } from "./businesses.service";
import { FinanceService } from "../finance/finance.service";

class ExtractDto {
  @IsString()
  @MinLength(8)
  text!: string;
}

class UpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsNumber() monthlyRevenueSom?: number;
  @IsOptional() @IsString() goals?: string;
}

@Controller("businesses")
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(
    private readonly businesses: BusinessesService,
    private readonly finance: FinanceService,
  ) {}

  @Get("me")
  me(@Req() req: { user: { id: string } }) {
    return this.businesses.mine(req.user.id);
  }

  @Post("profile/extract")
  extract(@Req() req: { user: { id: string } }, @Body() dto: ExtractDto) {
    return this.businesses.extractAndSave(req.user.id, dto.text);
  }

  @Patch("me")
  update(@Req() req: { user: { id: string } }, @Body() dto: UpdateDto) {
    return this.businesses.updateProfile(req.user.id, dto);
  }

  @Get("me/health")
  async health(@Req() req: { user: { id: string } }) {
    const b = await this.businesses.mine(req.user.id);
    return this.finance.healthForBusiness(b.id);
  }

  @Get("me/briefing")
  briefing(@Req() req: { user: { id: string } }) {
    return this.businesses.briefing(req.user.id);
  }
}
