import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Internal row interfaces (matching SQL column aliases)
interface QuizSearchRow {
  id: number;
  title: string;
  visibility: string;
  createdAt: Date;
  rank: number;
  snippet: string | null;
  totalCount: number;
}

interface QuestionSearchRow {
  id: number;
  title: string;
  subType: string;
  createdAt: Date;
  rank: number;
  snippet: string | null;
  totalCount: number;
}

interface SourceSearchRow {
  id: number;
  title: string;
  subType: string;
  createdAt: Date;
  rank: number;
  snippet: string | null;
  totalCount: number;
}

interface FavoriteSearchRow {
  id: number;
  title: string;
  subType: string;
  createdAt: Date;
  rank: number;
  snippet: string | null;
  totalCount: number;
}

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
  constructor(private readonly dataSource: DataSource) {}

  async search(params: SearchParams): Promise<any> {
    const { q, type, page, pageSize, offset, userId } = params;

    // Single-type search
    if (type !== 'all') {
      return this.searchSingleType(q, userId, page, pageSize, offset, type);
    }
    // "all" mode: fetch up to pageSize from each category, merge by rank
    return this.searchAll(q, userId, pageSize);
  }

  // -------------------------------------------------------------------------
  // Single type with proper pagination
  // -------------------------------------------------------------------------
  private async searchSingleType(
    q: string,
    userId: number,
    page: number,
    pageSize: number,
    offset: number,
    type: string,
  ): Promise<any> {
    let items: any[] = [];
    let totalCount = 0;

    switch (type) {
      case 'quiz':
        const quizRes = await this.searchQuizzes(q, userId, offset, pageSize);
        items = quizRes.items;
        totalCount = quizRes.totalCount;
        break;
      case 'question':
        const questionRes = await this.searchQuestions(q, userId, offset, pageSize);
        items = questionRes.items;
        totalCount = questionRes.totalCount;
        break;
      case 'source':
        const sourceRes = await this.searchSources(q, userId, offset, pageSize);
        items = sourceRes.items;
        totalCount = sourceRes.totalCount;
        break;
      case 'favorite':
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
  // "all" mode: fetch top pageSize from each category, merge, return counts
  // -------------------------------------------------------------------------
  private async searchAll(q: string, userId: number, pageSize: number): Promise<any> {
    // Run sequentially (DbContext not thread-safe, but DataSource is fine concurrently?
    // To mimic .NET behaviour we run sequentially)
    const quizzes = await this.searchQuizzes(q, userId, 0, pageSize);
    const questions = await this.searchQuestions(q, userId, 0, pageSize);
    const sources = await this.searchSources(q, userId, 0, pageSize);
    const favorites = await this.searchFavorites(q, userId, 0, pageSize);

    const merged = [...quizzes.items, ...questions.items, ...sources.items, ...favorites.items]
      .sort((a, b) => b.rank - a.rank)
      .slice(0, pageSize);

    const totalCount =
      quizzes.totalCount + questions.totalCount + sources.totalCount + favorites.totalCount;

    return {
      query: q,
      type: 'all',
      page: 1,
      pageSize,
      totalCount,
      totalPages: 1, // as per .NET spec
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
  // Quiz search (public + user's private, disabled = false)
  // -------------------------------------------------------------------------
  private async searchQuizzes(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ): Promise<{ items: any[]; totalCount: number }> {
    const sql = `
      SELECT
        q.id AS "id",
        q.title AS "title",
        q.visibility AS "visibility",
        q.created_at AS "createdAt",
        ts_rank(
          to_tsvector('english', q.title || ' ' || COALESCE(q.description, '')),
          plainto_tsquery('english', $1)
        ) AS "rank",
        ts_headline(
          'english',
          COALESCE(q.description, q.title),
          plainto_tsquery('english', $1),
          'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
        ) AS "snippet",
        COUNT(*) OVER()::int AS "totalCount"
      FROM quiz q
      WHERE q.disabled = false
        AND (q.visibility = 'public' OR q.user_id = $2)
        AND (
          to_tsvector('english', q.title || ' ' || COALESCE(q.description, ''))
            @@ plainto_tsquery('english', $1)
          OR EXISTS (
            SELECT 1
            FROM quiz_tag qt
            JOIN tag t ON t.id = qt.tag_id
            WHERE qt.quiz_id = q.id
              AND t.name ILIKE '%' || $1 || '%'
          )
        )
      ORDER BY "rank" DESC, q.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const rows: QuizSearchRow[] = await this.dataSource.query(sql, [q, userId, limit, offset]);
    if (rows.length === 0) {
      return { items: [], totalCount: 0 };
    }

    const totalCount = rows[0].totalCount;
    const quizIds = rows.map(r => r.id);

    // Batch load tags
    const tagRows = await this.dataSource.query(
      `
      SELECT qt.quiz_id AS "quizId", t.name AS "name"
      FROM quiz_tag qt
      JOIN tag t ON t.id = qt.tag_id
      WHERE qt.quiz_id = ANY($1)
      `,
      [quizIds],
    );
    const tagMap = new Map<number, string[]>();
    for (const row of tagRows) {
      const quizId = row.quizId;
      if (!tagMap.has(quizId)) tagMap.set(quizId, []);
      tagMap.get(quizId)!.push(row.name);
    }

    const items = rows.map(row => ({
      resultType: 'quiz',
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      rank: row.rank,
      tags: tagMap.get(row.id) || [],
      createdAt: row.createdAt,
      subType: null,
      visibility: row.visibility,
    }));

    return { items, totalCount };
  }

  // -------------------------------------------------------------------------
  // Question search (user's own only)
  // -------------------------------------------------------------------------
  private async searchQuestions(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ): Promise<{ items: any[]; totalCount: number }> {
    const sql = `
      SELECT
        q.id AS "id",
        LEFT(q.content, 120) AS "title",
        q.type AS "subType",
        q.created_at AS "createdAt",
        ts_rank(
          to_tsvector('english', q.content || ' ' || COALESCE(q.explanation, '')),
          plainto_tsquery('english', $1)
        ) AS "rank",
        ts_headline(
          'english',
          q.content || ' ' || COALESCE(q.explanation, ''),
          plainto_tsquery('english', $1),
          'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
        ) AS "snippet",
        COUNT(*) OVER()::int AS "totalCount"
      FROM question q
      WHERE q.user_id = $2
        AND (
          to_tsvector('english', q.content || ' ' || COALESCE(q.explanation, ''))
            @@ plainto_tsquery('english', $1)
          OR EXISTS (
            SELECT 1
            FROM question_tag qt
            JOIN tag t ON t.id = qt.tag_id
            WHERE qt.question_id = q.id
              AND t.name ILIKE '%' || $1 || '%'
          )
        )
      ORDER BY "rank" DESC, q.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const rows: QuestionSearchRow[] = await this.dataSource.query(sql, [q, userId, limit, offset]);
    if (rows.length === 0) {
      return { items: [], totalCount: 0 };
    }

    const totalCount = rows[0].totalCount;
    const questionIds = rows.map(r => r.id);

    const tagRows = await this.dataSource.query(
      `
      SELECT qt.question_id AS "questionId", t.name AS "name"
      FROM question_tag qt
      JOIN tag t ON t.id = qt.tag_id
      WHERE qt.question_id = ANY($1)
      `,
      [questionIds],
    );
    const tagMap = new Map<number, string[]>();
    for (const row of tagRows) {
      const qId = row.questionId;
      if (!tagMap.has(qId)) tagMap.set(qId, []);
      tagMap.get(qId)!.push(row.name);
    }

    const items = rows.map(row => ({
      resultType: 'question',
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      rank: row.rank,
      tags: tagMap.get(row.id) || [],
      createdAt: row.createdAt,
      subType: row.subType,
      visibility: null,
    }));

    return { items, totalCount };
  }

  // -------------------------------------------------------------------------
  // Source search (user's own, not deleted)
  // -------------------------------------------------------------------------
  private async searchSources(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ): Promise<{ items: any[]; totalCount: number }> {
    const sql = `
      SELECT
        s.id AS "id",
        s.title AS "title",
        s.type AS "subType",
        s.created_at AS "createdAt",
        ts_rank(
          to_tsvector('english', s.title || ' ' || COALESCE(LEFT(s.raw_text, 2000), '')),
          plainto_tsquery('english', $1)
        ) AS "rank",
        ts_headline(
          'english',
          s.title || ' ' || COALESCE(LEFT(s.raw_text, 2000), ''),
          plainto_tsquery('english', $1),
          'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
        ) AS "snippet",
        COUNT(*) OVER()::int AS "totalCount"
      FROM source s
      WHERE s.user_id = $2
        AND s.deleted_at IS NULL
        AND to_tsvector('english', s.title || ' ' || COALESCE(LEFT(s.raw_text, 2000), ''))
            @@ plainto_tsquery('english', $1)
      ORDER BY "rank" DESC, s.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const rows: SourceSearchRow[] = await this.dataSource.query(sql, [q, userId, limit, offset]);
    if (rows.length === 0) {
      return { items: [], totalCount: 0 };
    }

    const totalCount = rows[0].totalCount;
    const items = rows.map(row => ({
      resultType: 'source',
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      rank: row.rank,
      tags: [],
      createdAt: row.createdAt,
      subType: row.subType,
      visibility: null,
    }));

    return { items, totalCount };
  }

  // -------------------------------------------------------------------------
  // Favorite search (user's own)
  // -------------------------------------------------------------------------
  private async searchFavorites(
    q: string,
    userId: number,
    offset: number,
    limit: number,
  ): Promise<{ items: any[]; totalCount: number }> {
    const sql = `
      SELECT
        fi.id AS "id",
        fi.text AS "title",
        fi.type AS "subType",
        fi.created_at AS "createdAt",
        ts_rank(
          to_tsvector('english', fi.text || ' ' || COALESCE(fi.note, '')),
          plainto_tsquery('english', $1)
        ) AS "rank",
        ts_headline(
          'english',
          fi.text || ' ' || COALESCE(fi.note, ''),
          plainto_tsquery('english', $1),
          'MaxWords=20,MinWords=5,StartSel=<mark>,StopSel=</mark>'
        ) AS "snippet",
        COUNT(*) OVER()::int AS "totalCount"
      FROM favorite_item fi
      WHERE fi.user_id = $2
        AND to_tsvector('english', fi.text || ' ' || COALESCE(fi.note, ''))
            @@ plainto_tsquery('english', $1)
      ORDER BY "rank" DESC, fi.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const rows: FavoriteSearchRow[] = await this.dataSource.query(sql, [q, userId, limit, offset]);
    if (rows.length === 0) {
      return { items: [], totalCount: 0 };
    }

    const totalCount = rows[0].totalCount;
    const items = rows.map(row => ({
      resultType: 'favorite',
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      rank: row.rank,
      tags: [],
      createdAt: row.createdAt,
      subType: row.subType,
      visibility: null,
    }));

    return { items, totalCount };
  }
}