import { Module, forwardRef } from "@nestjs/common"; // ← thêm forwardRef
import { TypeOrmModule } from "@nestjs/typeorm";
import { LlmLog } from "./llm.entity";
import { LlmRepository } from "./llm.repository";
import { LlmService } from "./llm.service";
import { LlmController } from "./llm.controller";
import { QueueModule } from "../queue/queue.module";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmLog]),
    forwardRef(() => QueueModule), // ← thay đổi tại đây
    SessionModule,
  ],
  providers: [LlmRepository, LlmService],
  controllers: [LlmController],
  exports: [LlmService, LlmRepository],
})
export class LlmModule {}
