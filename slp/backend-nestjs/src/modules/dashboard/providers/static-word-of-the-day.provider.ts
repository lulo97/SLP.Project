import { Injectable } from '@nestjs/common';
import { IWordOfTheDayProvider } from '../interfaces/word-of-the-day-provider.interface';
import { WordOfTheDayDto } from '../dto/word-of-the-day.dto';

const words: WordOfTheDayDto[] = [
  {
    word: 'perspicacious',
    partOfSpeech: 'adjective',
    vietnameseTranslation: 'sắc sảo',
    example: 'She is a perspicacious student.',
    origin: 'From Latin perspicax, from perspicere "look closely".',
    funFact: 'First used in English in the 1630s.',
  },
  {
    word: 'ephemeral',
    partOfSpeech: 'adjective',
    vietnameseTranslation: 'phù du, ngắn ngủi',
    example: 'Social media fame is often ephemeral.',
    origin: 'From Greek ephēmeros "lasting only a day".',
    funFact: 'Mayflies are called ephemeroptera because of their short lifespan.',
  },
  // Add more as needed
];

@Injectable()
export class StaticWordOfTheDayProvider implements IWordOfTheDayProvider {
  async getWordOfTheDayAsync(): Promise<WordOfTheDayDto> {
    const dayOfYear = this.getDayOfYear(new Date());
    const index = (dayOfYear - 1) % words.length;
    return words[index];
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
}