import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FileStorageService } from './file-storage.service';

@Module({
  imports: [HttpModule],
  providers: [FileStorageService],
  exports: [FileStorageService],
})
export class FileStorageModule {}