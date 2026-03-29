import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IQueueService } from './queue.service.interface';
import { RedisQueueService } from './redis-queue.service';
import { NullQueueService } from './null-queue.service';
import { RedisConnectionFactory } from './redis-connection.factory';
import { QueueProcessorService } from './queue-processor.service';
import { LlmModule } from '../llm/llm.module';

@Global()
@Module({
  imports: [forwardRef(() => LlmModule)],
  providers: [
    RedisConnectionFactory,
    {
      provide: IQueueService,
      useFactory: (config: ConfigService, redisFactory: RedisConnectionFactory) => {
        const enabled = config.get<boolean>('QUEUE_ENABLED', false);
        if (!enabled) {
          return new NullQueueService();
        }
        return new RedisQueueService(redisFactory);
      },
      inject: [ConfigService, RedisConnectionFactory],
    },
    QueueProcessorService,
  ],
  exports: [IQueueService],
})
export class QueueModule {}