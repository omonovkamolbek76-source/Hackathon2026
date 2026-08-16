import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OrchestratorService } from "./orchestrator.service";

class ChatDto {
  @IsString()
  @MinLength(2)
  message!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

class FeedbackDto {
  @IsString()
  decisionId!: string;

  @IsBoolean()
  helpful!: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Post("chat")
  chat(@Req() req: { user: { id: string } }, @Body() dto: ChatDto) {
    return this.orchestrator.chat(req.user.id, dto.message, dto.conversationId);
  }

  @Post("feedback")
  feedback(@Req() req: { user: { id: string } }, @Body() dto: FeedbackDto) {
    return this.orchestrator.feedback(req.user.id, dto.decisionId, dto.helpful, dto.comment);
  }

  @Get("conversations")
  conversations(@Req() req: { user: { id: string } }) {
    return this.orchestrator.conversations(req.user.id);
  }

  @Get("conversations/:id")
  conversation(@Req() req: { user: { id: string } }, @Param("id") id: string) {
    return this.orchestrator.conversation(req.user.id, id);
  }

  @Get("tasks")
  tasks(@Req() req: { user: { id: string } }) {
    return this.orchestrator.tasks(req.user.id);
  }
}
