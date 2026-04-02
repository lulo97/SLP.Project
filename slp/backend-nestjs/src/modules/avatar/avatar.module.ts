import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AvatarController } from './avatar.controller';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [UserModule, FileStorageModule, SessionModule],
  controllers: [AvatarController],
})
export class AvatarModule {}