import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: 'IEmailService',
      useClass: EmailService,
    },
  ],
  exports: ['IEmailService'],
})
export class EmailModule {}