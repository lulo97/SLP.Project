import { WordOfTheDayDto } from "../dto/word-of-the-day.dto";

export const WORD_OF_THE_DAY_PROVIDER = 'WORD_OF_THE_DAY_PROVIDER';

export interface IWordOfTheDayProvider {
  getWordOfTheDay(): Promise<WordOfTheDayDto>;
}

// Static provider
export class StaticWordOfTheDayProvider implements IWordOfTheDayProvider {
  private static readonly words: WordOfTheDayDto[] = [
    {
      word: "perspicacious",
      partOfSpeech: "adjective",
      vietnameseTranslation: "sắc sảo",
      example: "She is a perspicacious student.",
      origin: 'From Latin perspicax, from perspicere "look closely".',
      funFact: "First used in English in the 1630s.",
    },
    {
      word: "ephemeral",
      partOfSpeech: "adjective",
      vietnameseTranslation: "phù du, ngắn ngủi",
      example: "Social media fame is often ephemeral.",
      origin: 'From Greek ephēmeros "lasting only a day".',
      funFact:
        "Mayflies are called ephemeroptera because of their short lifespan.",
    },
  ];

  // Add this helper inside your StaticWordOfTheDayProvider class
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff =
      date.getTime() -
      start.getTime() +
      (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  // Then update your getWordOfTheDay method:
  async getWordOfTheDay(): Promise<WordOfTheDayDto> {
    const dayOfYear = this.getDayOfYear(new Date());
    const index = (dayOfYear - 1) % StaticWordOfTheDayProvider.words.length;
    return StaticWordOfTheDayProvider.words[index];
  }
}

// DB provider
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DailyWord } from "../daily-word.entity";

@Injectable()
export class DbWordOfTheDayProvider implements IWordOfTheDayProvider {
  constructor(
    @InjectRepository(DailyWord)
    private dailyWordRepo: Repository<DailyWord>,
  ) {}

  async getWordOfTheDay(): Promise<WordOfTheDayDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let word = await this.dailyWordRepo.findOne({
      where: { targetDate: today },
    });

    if (!word) {
      // Fallback to the most recent past word
      word = await this.dailyWordRepo.findOne({
        where: { targetDate: new Date("1970-01-01") }, // any date <= today
        order: { targetDate: "DESC" },
      });
    }

    if (!word) {
      return {
        word: "Welcome!",
        partOfSpeech: "",
        vietnameseTranslation: "Chào mừng",
        example: "No word of the day yet.",
        origin: undefined, // Changed from null
        funFact: undefined, // Changed from null
      };
    }

    return {
      word: word.word,
      partOfSpeech: word.partOfSpeech || "",
      vietnameseTranslation: word.vietnameseTranslation || "",
      example: word.example || "",
      origin: word.origin,
      funFact: word.funFact,
    };
  }
}
