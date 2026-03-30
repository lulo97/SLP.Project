import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminLog } from './admin-log.entity';
import { AdminLogRepository } from './admin-log.repository';
import { UserModule } from '../user/user.module';
import { QuizModule } from '../quiz/quiz.module';
import { CommentModule } from '../comment/comment.module';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminLog]),
    UserModule,
    QuizModule,
    CommentModule,
    SessionModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminLogRepository],
  exports: [AdminService],
})
export class AdminModule {}