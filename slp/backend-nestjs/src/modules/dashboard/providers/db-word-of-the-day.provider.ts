import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { IWordOfTheDayProvider } from '../interfaces/word-of-the-day-provider.interface';
import { WordOfTheDayDto } from '../dto/word-of-the-day.dto';
import { DailyWord } from '../daily-word.entity';

@Injectable()
export class DbWordOfTheDayProvider implements IWordOfTheDayProvider {
  constructor(
    @InjectRepository(DailyWord)
    private readonly dailyWordRepo: Repository<DailyWord>,
  ) {}

  async getWordOfTheDayAsync(): Promise<WordOfTheDayDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try today's word
    let wordEntity = await this.dailyWordRepo.findOne({
      where: { targetDate: today },
    });

    // Fallback to most recent past word
    if (!wordEntity) {
      wordEntity = await this.dailyWordRepo.findOne({
        where: { targetDate: LessThanOrEqual(today) },
        order: { targetDate: 'DESC' },
      });
    }

    // Fallback placeholder
    if (!wordEntity) {
      return {
        word: 'Welcome!',
        partOfSpeech: '',
        vietnameseTranslation: 'Chào mừng',
        example: 'No word of the day yet. Please add some entries to the daily_word table.',
        origin: undefined,
        funFact: undefined,
      };
    }

    return {
      word: wordEntity.word,
      partOfSpeech: wordEntity.partOfSpeech ?? '',
      vietnameseTranslation: wordEntity.vietnameseTranslation ?? '',
      example: wordEntity.example ?? '',
      origin: wordEntity.origin,
      funFact: wordEntity.funFact,
    };
  }
}