import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Explanation } from "./explanation.entity";
import { ExplanationRepository } from "./explanation.repository";
import { ExplanationService } from "./explanation.service";
import { ExplanationController } from "./explanation.controller";
import { SourceModule } from "../source/source.module";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Explanation]),
    SourceModule,
    SessionModule,
  ],
  providers: [ExplanationRepository, ExplanationService],
  controllers: [ExplanationController],
  exports: [ExplanationService],
})
export class ExplanationModule {}
