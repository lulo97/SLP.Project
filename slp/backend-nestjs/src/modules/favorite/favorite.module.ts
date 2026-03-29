import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteItem } from './favorite-item.entity';
import { FavoriteRepository } from './favorite.repository';
import { FavoriteService } from './favorite.service';
import { FavoriteController } from './favorite.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FavoriteItem])],
  controllers: [FavoriteController],
  providers: [FavoriteRepository, FavoriteService],
  exports: [FavoriteService],
})
export class FavoriteModule {}