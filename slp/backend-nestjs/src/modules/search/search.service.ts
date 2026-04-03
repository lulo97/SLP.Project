import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, In } from "typeorm";
import { Quiz } from "../quiz/quiz.entity";
import { Question } from "../question/question.entity";
import { Source } from "../source/source.entity";
import { FavoriteItem } from "../favorite/favorite-item.entity";
import { QuizTag } from "../quiz/quiz-tag.entity";
import { QuestionTag } from "../question/question-tag.entity";

export interface SearchParams {
  q: string;
  type: string;
  page: number;
  pageSize: number;
  offset: number;
  userId: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Quiz)
    private quizRepo: Repository<Quiz>,
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    @InjectRepository(Source)
    private sourceRepo: Repository<Source>,
    @InjectRepository(FavoriteItem)
    private favoriteRepo: Repository<FavoriteItem>,
    @InjectRepository(QuizTag)
    private quizTagRepo: Repository<QuizTag>,
    @InjectRepository(QuestionTag)
    private questionTagRepo: Repository<QuestionTag>,
  ) {}

  async search(params: SearchParams): Promise<any> {
    const { q, type, page, pageSize, offset, userId } = params;
    if (type !== "all") {
      return this.searchSingleType(q, userId, page, pageSize, offset, type);
    }
    return this.searchAll(q, userId, pageSize);
  }

  // -------------------------------------------------------------------------
  // Single type with proper pagination (same as .NET)
  // -------------------------------------------------------------------------
  private async searchSingleType(
    q: string,
    userId: number,
    page: number,
    pageSize: number,
    offset: number,
    type: string,
  ) {
    let items: any[] = [];
    let totalCount = 0;

    switch (type) {
      case "quiz":
        const quizRes = await this.searchQuizzes(q, userId, offset, pageSize);
        items = quizRes.items;
        totalCount = quizRes.totalCount;
        break;
      case "question":
        const questionRes = await this.searchQuestions(
          q,
          userId,
          offset,
          pageSize,
        );
        items = questionRes.items;
        totalCount = questionRes.totalCount;
        break;
      case "source":
        const sourceRes = await this.searchSources(q, userId, offset, pageSize);
        items = sourceRes.items;
        totalCount = sourceRes.totalCount;
        break;
      case "favorite":
        const favRes = await this.searchFavorites(q, userId, offset, pageSize);
        items = favRes.items;
        totalCount = favRes.totalCount;
        break;
    }

    return {
      query: q,
      type,
      page,
      pageSize,
      totalCount,
      totalPages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
      results: items,
    };
  }

  // -------------------------------------------------------------------------
  // "all" mode: fetch up to pageSize from each category, merge by created_at DESC
  // -------------------------------------------------------------------------
  private async searchAll(q: string, userId: number, pageSize: number) {
    const quizzes = await this.searchQuizzes(q, userId, 0, pageSize);
    const questions = await this.searchQuestions(q, userId, 0, pageSize);
    const sources = await this.searchSources(q, userId, 0, pageSize);
    const favorites = await this.searchFavorites(q, userId, 0, pageSize);

    const merged = [
      ...quizzes.items,
      ...questions.items,
      ...sources.items,
      ...favorites.items,
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, pageSize);

    const totalCount =
      quizzes.totalCount +
      questions.totalCount +
      sources.totalCount +
      favorites.totalCount;

    return {
      query: q,
      type: "all",
      page: 1,
      pageSize,
      totalCount,
      totalPages: 1,
      results: merged,
      categoryCounts: {
        quizzes: quizzes.totalCount,
        questions: questions.totalCount,
        sources: sources.totalCount,
        favorites: favorites.totalCount,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Quiz search – identical to .NET: public + user's own, ILIKE on title
  // -------------------------------------------------------------------------
  private async searchQuizzes(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ) {
    const pattern = `%${q}%`;
    const queryBuilder = this.quizRepo
      .createQueryBuilder("quiz")
      .where("quiz.disabled = false")
      .andWhere("(quiz.visibility = :public OR quiz.userId = :userId)", {
        public: "public",
        userId,
      })
      .andWhere("quiz.title ILIKE :pattern", { pattern })
      .orderBy("quiz.createdAt", "DESC")
      .skip(offset)
      .take(limit);

    const [quizzes, totalCount] = await queryBuilder.getManyAndCount();

    if (quizzes.length === 0) return { items: [], totalCount };

    const quizIds = quizzes.map((q) => q.id);
    const quizTags = await this.quizTagRepo.find({
      where: { quizId: In(quizIds) },
      relations: ["tag"],
    });
    const tagMap = new Map<number, string[]>();
    for (const qt of quizTags) {
      if (!tagMap.has(qt.quizId)) tagMap.set(qt.quizId, []);
      tagMap.get(qt.quizId)!.push(qt.tag.name);
    }

    const items = quizzes.map((quiz) => ({
      resultType: "quiz",
      id: quiz.id,
      title: quiz.title,
      snippet:
        quiz.title.length > 200
          ? quiz.title.substring(0, 200) + "..."
          : quiz.title,
      rank: 1.0,
      tags: tagMap.get(quiz.id) || [],
      createdAt: quiz.createdAt,
      subType: null,
      visibility: quiz.visibility,
    }));

    return { items, totalCount };
  }

  // -------------------------------------------------------------------------
  // Question search – user's own, ILIKE on content
  // -------------------------------------------------------------------------
  private async searchQuestions(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ) {
    const pattern = `%${q}%`;
    const queryBuilder = this.questionRepo
      .createQueryBuilder("question")
      .where("question.userId = :userId", { userId })
      .andWhere("question.content ILIKE :pattern", { pattern })
      .orderBy("question.createdAt", "DESC")
      .skip(offset)
      .take(limit);

    const [questions, totalCount] = await queryBuilder.getManyAndCount();

    if (questions.length === 0) return { items: [], totalCount };

    const questionIds = questions.map((q) => q.id);
    const questionTags = await this.questionTagRepo.find({
      where: { questionId: In(questionIds) },
      relations: ["tag"],
    });
    const tagMap = new Map<number, string[]>();
    for (const qt of questionTags) {
      if (!tagMap.has(qt.questionId)) tagMap.set(qt.questionId, []);
      tagMap.get(qt.questionId)!.push(qt.tag.name);
    }

    const items = questions.map((q) => ({
      resultType: "question",
      id: q.id,
      title: q.content.length > 120 ? q.content.substring(0, 120) : q.content,
      snippet:
        q.content.length > 200
          ? q.content.substring(0, 200) + "..."
          : q.content,
      rank: 1.0,
      tags: tagMap.get(q.id) || [],
      createdAt: q.createdAt,
      subType: q.type,
      visibility: null,
    }));

    return { items, totalCount };
  }

  // -------------------------------------------------------------------------
  // Source search – user's own, not deleted, ILIKE on title
  // -------------------------------------------------------------------------
  private async searchSources(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ) {
    const pattern = `%${q}%`;
    const [sources, totalCount] = await this.sourceRepo
      .createQueryBuilder("source")
      .where("source.userId = :userId", { userId })
      .andWhere("source.deletedAt IS NULL")
      .andWhere("source.title ILIKE :pattern", { pattern })
      .orderBy("source.createdAt", "DESC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const items = sources.map((s) => ({
      resultType: "source",
      id: s.id,
      title: s.title,
      snippet:
        s.title.length > 200 ? s.title.substring(0, 200) + "..." : s.title,
      rank: 1.0,
      tags: [],
      createdAt: s.createdAt,
      subType: s.type,
      visibility: null,
    }));

    return { items, totalCount };
  }

  // -------------------------------------------------------------------------
  // Favorite search – user's own, ILIKE on text
  // -------------------------------------------------------------------------
  private async searchFavorites(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ) {
    const pattern = `%${q}%`;
    const [favorites, totalCount] = await this.favoriteRepo
      .createQueryBuilder("fav")
      .where("fav.userId = :userId", { userId })
      .andWhere("fav.text ILIKE :pattern", { pattern })
      .orderBy("fav.createdAt", "DESC")
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const items = favorites.map((f) => ({
      resultType: "favorite",
      id: f.id,
      title: f.text,
      snippet: f.text.length > 200 ? f.text.substring(0, 200) + "..." : f.text,
      rank: 1.0,
      tags: [],
      createdAt: f.createdAt,
      subType: f.type,
      visibility: null,
    }));

    return { items, totalCount };
  }
}
