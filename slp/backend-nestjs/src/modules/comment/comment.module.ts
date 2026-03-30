import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";
import { Comment } from "./comment.entity";
import { CommentHistory } from "./comment-history.entity";
import { CommentRepository } from "./comment.repository";
import { AdminModule } from "../admin/admin.module";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentHistory]),
    AdminModule,
    SessionModule,
  ],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
  exports: [CommentRepository],
})
export class CommentModule {}