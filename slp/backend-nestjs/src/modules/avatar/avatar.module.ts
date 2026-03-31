import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { AvatarController } from './avatar.controller';

@Module({
  imports: [UserModule, FileStorageModule],
  controllers: [AvatarController],
})
export class AvatarModule {}