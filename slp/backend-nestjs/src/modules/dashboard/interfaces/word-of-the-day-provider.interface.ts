import { WordOfTheDayDto } from '../dto/word-of-the-day.dto';

export interface IWordOfTheDayProvider {
  getWordOfTheDayAsync(): Promise<WordOfTheDayDto>;
}