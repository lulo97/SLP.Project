import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { SessionModule } from "../session/session.module"; // Thêm import

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    SessionModule, // Thêm SessionModule vào imports
  ],
  providers: [UserRepository, UserService],
  controllers: [UserController],
  exports: [UserRepository, UserService],
})
export class UserModule {}
