#!/usr/bin/env node
/**
 * PostgreSQL Seed Generator with LLM Integration
 * 
 * Generates realistic data for all tables in the schema using a local Llama server.
 * Configuration is at the top of the file. Run with: node seed.js
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
  // LLM settings
  LLAMA_BASE_URL: 'http://localhost:8080',
  LLAMA_MODEL: 'llama',
  LLAMA_TIMEOUT: 30000, // ms per request
  
  // Output
  OUT_FILE: 'seed.sql',
  
  // Random seed for reproducibility
  SEED: 42,
  
  // Truncate tables and reset sequences before insert
  TRUNCATE: true,
  RESET_SEQUENCES: true,
  
  // LLM calling strategy: 'batch' or 'sequential'
  BATCH_MODE: 'batch',
  BATCH_SIZE: 5, // number of items per batch request
  
  // Row counts (adjust as needed)
  NUM_USERS: 15,
  NUM_NOTES: 12,
  NUM_SOURCES: 12,
  NUM_QUESTIONS: 25,
  NUM_QUIZZES: 10,
  NUM_DAILY_WORDS: 14,
  NUM_TAGS: 20,
  NUM_COMMENTS: 20,
  NUM_FAVORITES: 12,
  ATTEMPTS_PER_QUIZ: 3,
  NUM_EXPLANATIONS: 10,
  NUM_LLM_LOGS: 15,
  NUM_METRICS: 20,
  NUM_ADMIN_LOGS: 10,
  NUM_REPORTS: 8,
  NUM_SESSIONS: 15,
  NUM_USER_SOURCE_PROGRESS: 12,
  
  // Admin user (fixed)
  ADMIN: {
    username: 'admin',
    password_hash: 'DtsXfAbEsPrw5i8DZOEaNw==.HUDFlMvYikF1nsac3B/9hJi0xu4lR7dNbAdnd8u5rLk=',
    email: 'luongpysl@gmail.com',
    email_confirmed: false,
    role: 'admin',
    status: 'active',
    email_verification_token: 'dc4ce0e7-e872-415e-80a5-fede7ee54c65',
    avatar_filename: null
  }
};

// ==================== IMPORTS ====================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

// ==================== DETERMINISTIC RNG ====================
function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(CONFIG.SEED);
const randInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const sample = (arr, n) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length));
};
const randomDate = (daysAgoMin = 0, daysAgoMax = 30, hourMin = 0, hourMax = 23) => {
  const date = new Date();
  date.setDate(date.getDate() - randInt(daysAgoMin, daysAgoMax));
  date.setHours(randInt(hourMin, hourMax), randInt(0, 59), randInt(0, 59), 0);
  return date;
};
const randomFutureDate = (daysFromNowMin = 1, daysFromNowMax = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + randInt(daysFromNowMin, daysFromNowMax));
  date.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59), 0);
  return date;
};
const randomInet = () => `192.168.${randInt(1, 254)}.${randInt(1, 254)}`;
const randomUuid = () => crypto.randomUUID();

// ==================== LLM CLIENT ====================
async function callLlama(prompt, parseJson = false, maxTokens = 300) {
  const url = `${CONFIG.LLAMA_BASE_URL}/v1/chat/completions`;
  const body = {
    model: CONFIG.LLAMA_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that generates realistic data for an English learning application. Return only the requested data without additional commentary.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.8,
    max_tokens: maxTokens,
    response_format: parseJson ? { type: 'json_object' } : undefined
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.LLAMA_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty LLM response');

    if (parseJson) {
      const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '');
      return JSON.parse(cleaned);
    }

    return content;
  } catch (error) {
    console.error('LLM error:', error.message);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateBatch(promptTemplate, count) {
  const generateSequential = async () => {
    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        const res = await callLlama(promptTemplate(i), false, 200);
        results.push(res);
      } catch {
        console.warn(`LLM failed for item ${i}, using fallback`);
        results.push(`Fallback content for item ${i + 1}`);
      }
    }
    return results;
  };

  if (CONFIG.BATCH_MODE === 'sequential' || count <= 1) {
    return generateSequential();
  }

  const batchPrompt = [
    `Generate exactly ${count} distinct items.`,
    `Return only a valid JSON array of ${count} strings.`,
    ...Array.from({ length: count }, (_, i) => `Item ${i + 1}: ${promptTemplate(i)}`)
  ].join('\n');

  try {
    const json = await callLlama(batchPrompt, true, Math.max(500, 150 * count));

    const arr =
      Array.isArray(json) ? json :
      Array.isArray(json?.items) ? json.items :
      Array.isArray(json?.data) ? json.data :
      null;

    if (arr && arr.length === count) {
      return arr.map(String);
    }

    throw new Error('Invalid batch response');
  } catch {
    console.warn('Batch LLM failed, falling back to sequential');
    return generateSequential();
  }
}

// ==================== SQL ESCAPE HELPER ====================
function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) {
    return `'${value.toISOString().replace('T', ' ').replace('Z', '+00')}'`;
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  const str = String(value).replace(/\\/g, '\\\\').replace(/'/g, "''");
  return `'${str}'`;
}

// ==================== DATA STORAGE ====================
const tables = {
  users: [],
  admin_log: [],
  comment_history: [],
  comment: [],
  daily_word: [],
  explanation: [],
  favorite_item: [],
  llm_log: [],
  metrics: [],
  note: [],
  question_tag: [],
  question: [],
  quiz_attempt_answer: [],
  quiz_attempt: [],
  quiz_note: [],
  quiz_question: [],
  quiz_source: [],
  quiz_tag: [],
  quiz_view: [],
  quiz: [],
  report: [],
  sessions: [],
  source: [],
  tag: [],
  user_source_progress: []
};

// ==================== GENERATE USERS ====================
async function generateUsers() {
  console.log('Generating users...');
  
  // Admin user
  tables.users.push({
    id: 1,
    username: CONFIG.ADMIN.username,
    password_hash: CONFIG.ADMIN.password_hash,
    email: CONFIG.ADMIN.email,
    email_confirmed: CONFIG.ADMIN.email_confirmed,
    role: CONFIG.ADMIN.role,
    status: CONFIG.ADMIN.status,
    created_at: randomDate(30, 60, 8, 20),
    updated_at: randomDate(0, 10, 8, 20),
    password_reset_token: null,
    password_reset_expiry: null,
    email_verification_token: CONFIG.ADMIN.email_verification_token,
    avatar_filename: CONFIG.ADMIN.avatar_filename
  });

  const firstNames = ['Linh', 'Minh', 'Anh', 'Huy', 'Trang', 'Mai', 'Nam', 'Thanh', 'Thao', 'Tuan', 'John', 'Mary', 'David', 'Anna', 'Michael'];
  const lastNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Phan', 'Vu', 'Vo', 'Do', 'Smith', 'Johnson', 'Lee', 'Chen', 'Kim'];

  for (let i = 2; i <= CONFIG.NUM_USERS; i++) {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randInt(1, 99)}`;
    const email = `${username}@example.com`;
    const status = randInt(1, 10) > 8 ? 'banned' : 'active';
    const emailConfirmed = randInt(0, 1) === 1;
    const created = randomDate(1, 90, 0, 23);
    const updated = randomDate(0, 20, 0, 23);

    tables.users.push({
      id: i,
      username,
      password_hash: `$2b$10$dummyhash${crypto.randomBytes(16).toString('hex')}`,
      email,
      email_confirmed: emailConfirmed,
      role: 'user',
      status,
      created_at: created,
      updated_at: updated,
      password_reset_token: randInt(0, 3) === 0 ? randomUuid() : null,
      password_reset_expiry: randInt(0, 3) === 0 ? randomFutureDate(1, 2) : null,
      email_verification_token: emailConfirmed ? null : randomUuid(),
      avatar_filename: randInt(0, 1) === 0 ? `${username}.jpg` : null
    });
  }
}

// ==================== GENERATE TAGS ====================
async function generateTags() {
  console.log('Generating tags...');
  const tagNames = await generateBatch(
    (i) => `Generate a tag name for an English learning app (e.g., "Grammar", "IELTS", "Phrasal Verbs"). Be specific. Item ${i+1}:`,
    CONFIG.NUM_TAGS
  );
  for (let i = 0; i < CONFIG.NUM_TAGS; i++) {
    tables.tag.push({ id: i + 1, name: tagNames[i] });
  }
}

// ==================== GENERATE DAILY WORDS ====================
async function generateDailyWords() {
  console.log('Generating daily words...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < CONFIG.NUM_DAILY_WORDS; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i - 7); // mix of past and future
    const wordData = await callLlama(
      `Generate a daily English word for learners. Return a JSON object with fields: word (string), part_of_speech (string), vietnamese_translation (string), example (string), origin (string), fun_fact (string).`,
      true,
      500
    ).catch(() => ({
      word: `word${i+1}`,
      part_of_speech: 'noun',
      vietnamese_translation: `nghĩa tiếng Việt ${i+1}`,
      example: `Example sentence for word ${i+1}.`,
      origin: 'Unknown',
      fun_fact: `Fun fact about word ${i+1}.`
    }));

    tables.daily_word.push({
      id: i + 1,
      word: wordData.word,
      part_of_speech: wordData.part_of_speech,
      vietnamese_translation: wordData.vietnamese_translation,
      example: wordData.example,
      origin: wordData.origin,
      fun_fact: wordData.fun_fact,
      target_date: targetDate,
      created_at: randomDate(1, 30, 8, 18)
    });
  }
}

// ==================== GENERATE SOURCES ====================
async function generateSources() {
  console.log('Generating sources...');
  const types = ['book', 'link', 'note', 'pdf', 'txt'];
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);

  for (let i = 0; i < CONFIG.NUM_SOURCES; i++) {
    const type = pick(types);
    const user = pick(userIds);
    const title = await callLlama(
      `Generate a short title for a ${type} about learning English.`,
      false,
      50
    ).catch(() => `Source ${i + 1}`);

    let content = null;
    let rawText = '';
    let metadata = {};

    if (type === 'note') {
      const paragraphs = await generateBatch(
        (j) => `Write a short paragraph about an English learning topic (e.g., grammar tip, vocabulary, culture). Paragraph ${j + 1}:`,
        randInt(2, 4)
      );
      content = { paragraphs };
      rawText = paragraphs.join('\n\n');
      metadata = { topic: pick(['grammar', 'vocabulary', 'pronunciation', 'idioms']) };
    } else if (type === 'link') {
      const summary = await callLlama(
        `Write a 2-sentence summary of an online article about learning English.`,
        false,
        100
      );
      content = { summary };
      rawText = summary;
      metadata = { url: `https://example.com/article${i + 1}` };
    } else if (type === 'book') {
      const excerpt = await callLlama(
        `Write a short excerpt from a book about English learning.`,
        false,
        150
      );
      content = { excerpt };
      rawText = excerpt;
      metadata = { author: pick(['John Smith', 'Jane Doe', 'David Brown']), year: randInt(2000, 2023) };
    } else if (type === 'pdf') {
      const text = await callLlama(
        `Generate a few sentences of text from a PDF document about English grammar.`,
        false,
        150
      );
      content = { text };
      rawText = text;
      metadata = { pages: randInt(5, 50) };
    } else if (type === 'txt') {
      const text = await callLlama(
        `Generate plain text content about English learning tips.`,
        false,
        150
      );
      content = { text };
      rawText = text;
      metadata = { source: 'plain text file' };
    }

    const slug = slugify(title);

    tables.source.push({
      id: i + 1,
      user_id: user,
      type,
      title,
      url: type === 'link' ? `https://example.com/${slug}` : null,
      content,
      raw_html: type === 'link' ? `<html><body>${rawText}</body></html>` : null,
      raw_text: rawText,
      file_path: ['pdf', 'txt'].includes(type) ? `/uploads/${type}/${i + 1}.${type}` : null,
      metadata,
      deleted_at: randInt(1, 10) > 8 ? randomDate(1, 5) : null,
      created_at: randomDate(5, 60, 8, 22),
      updated_at: randomDate(0, 20, 8, 22)
    });
  }
}

// ==================== GENERATE NOTES ====================
async function generateNotes() {
  console.log('Generating notes...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);

  for (let i = 0; i < CONFIG.NUM_NOTES; i++) {
    const user = pick(userIds);
    const title = await callLlama(`Generate a short title for a personal note about learning English.`, false, 30).catch(() => `Note ${i+1}`);
    const content = await callLlama(`Write a short personal note (2-3 sentences) about an English learning experience or observation.`, false, 150).catch(() => `This is note ${i+1} content.`);

    tables.note.push({
      id: i + 1,
      user_id: user,
      title,
      content,
      created_at: randomDate(1, 60, 0, 23),
      updated_at: randomDate(0, 15, 0, 23)
    });
  }
}

// ==================== GENERATE QUESTIONS ====================
async function generateQuestions() {
  console.log('Generating questions...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  const questionTypes = ['multiple_choice', 'single_choice', 'fill_blank', 'ordering', 'matching', 'true_false', 'flashcard'];

  for (let i = 0; i < CONFIG.NUM_QUESTIONS; i++) {
    const type = pick(questionTypes);
    const user = pick(userIds);

    // Generate base content using LLM
    const prompt = `Generate a ${type} question for English learners. Return a JSON object with fields:
      - "content": the question text
      - "explanation": brief explanation of the correct answer
      - "metadata": an object specific to the question type:
        * for multiple_choice/single_choice: { "options": [{"id":"a","text":"..."}], "correctAnswers": ["a"] }
        * for fill_blank: { "answers": ["answer1", "answer2"], "keywords": ["keyword"] }
        * for ordering: { "items": [{"text":"Item 1","order_id":1}, ...] }
        * for matching: { "pairs": [{"id":1,"left":"Left 1","right":"Right 1"}, ...] }
        * for true_false: { "correctAnswer": true/false }
        * for flashcard: { "front": "word/phrase", "back": "definition/example" }
      Ensure the data is realistic and educational.`;
    
    let questionData;
    try {
      questionData = await callLlama(prompt, true, 800);
    } catch (e) {
      // Fallback template
      questionData = {
        content: `Sample ${type} question ${i+1}`,
        explanation: `Explanation for question ${i+1}`,
        metadata: {}
      };
      if (type === 'multiple_choice' || type === 'single_choice') {
        questionData.metadata = {
          options: [
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' }
          ],
          correctAnswers: ['a']
        };
      } else if (type === 'fill_blank') {
        questionData.metadata = { answers: ['correct answer'], keywords: [] };
      } else if (type === 'ordering') {
        questionData.metadata = { items: [{ text: 'Step 1', order_id: 1 }, { text: 'Step 2', order_id: 2 }] };
      } else if (type === 'matching') {
        questionData.metadata = { pairs: [{ id: 1, left: 'Left 1', right: 'Right 1' }] };
      } else if (type === 'true_false') {
        questionData.metadata = { correctAnswer: true };
      } else if (type === 'flashcard') {
        questionData.metadata = { front: 'word', back: 'definition' };
      }
    }

    tables.question.push({
      id: i + 1,
      user_id: user,
      type,
      content: questionData.content,
      explanation: questionData.explanation,
      metadata: questionData.metadata,
      created_at: randomDate(1, 60, 8, 22),
      updated_at: randomDate(0, 20, 8, 22)
    });
  }

  // Generate question_tag associations
  const tagIds = tables.tag.map(t => t.id);
  for (const q of tables.question) {
    const numTags = randInt(1, 3);
    const selectedTags = sample(tagIds, numTags);
    for (const tagId of selectedTags) {
      tables.question_tag.push({ question_id: q.id, tag_id: tagId });
    }
  }
}

// ==================== GENERATE QUIZZES ====================
async function generateQuizzes() {
  console.log('Generating quizzes...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  const noteIds = tables.note.map(n => n.id);
  const sourceIds = tables.source.map(s => s.id);
  const tagIds = tables.tag.map(t => t.id);

  for (let i = 0; i < CONFIG.NUM_QUIZZES; i++) {
    const user = pick(userIds);
    const title = await callLlama(`Generate a creative title for a quiz about English learning.`, false, 50).catch(() => `Quiz ${i+1}`);
    const description = await callLlama(`Write a short description for a quiz titled "${title}".`, false, 100).catch(() => `Description for quiz ${i+1}`);
    const visibility = randInt(0, 2) === 0 ? 'public' : 'private';
    const disabled = randInt(1, 10) === 1;
    const note = randInt(0, 3) === 0 ? pick(noteIds) : null;

    tables.quiz.push({
      id: i + 1,
      user_id: user,
      title,
      description,
      visibility,
      disabled,
      note_id: note,
      created_at: randomDate(1, 45, 8, 22),
      updated_at: randomDate(0, 10, 8, 22)
    });
  }

  // quiz_tag, quiz_source, quiz_note
  for (const quiz of tables.quiz) {
    // tags
    const numTags = randInt(1, 3);
    const selectedTags = sample(tagIds, numTags);
    for (const tagId of selectedTags) {
      tables.quiz_tag.push({ quiz_id: quiz.id, tag_id: tagId });
    }

    // sources
    const numSources = randInt(1, 2);
    const selectedSources = sample(sourceIds, numSources);
    for (const sourceId of selectedSources) {
      tables.quiz_source.push({ quiz_id: quiz.id, source_id: sourceId });
    }

    // note (already set)
    if (quiz.note_id) {
      tables.quiz_note.push({ quiz_id: quiz.id, note_id: quiz.note_id });
    }
  }
}

// ==================== GENERATE QUIZ QUESTIONS ====================
async function generateQuizQuestions() {
  console.log('Generating quiz questions...');
  const questionIds = tables.question.map(q => q.id);
  let qqId = 1;

  for (const quiz of tables.quiz) {
    const numQuestions = randInt(3, 7);
    const selectedQuestions = sample(questionIds, numQuestions);

    for (let idx = 0; idx < selectedQuestions.length; idx++) {
      const qId = selectedQuestions[idx];
      const question = tables.question.find(q => q.id === qId);
      
      // Create snapshot
      const snapshot = {
        original_question_id: qId,
        type: question.type,
        content: question.content,
        explanation: question.explanation,
        metadata: question.metadata,
        tags: tables.question_tag.filter(qt => qt.question_id === qId).map(qt => qt.tag_id)
      };

      tables.quiz_question.push({
        id: qqId++,
        quiz_id: quiz.id,
        original_question_id: qId,
        question_snapshot: snapshot,
        display_order: idx + 1,
        created_at: randomDate(0, 20, 8, 22),
        updated_at: randomDate(0, 5, 8, 22)
      });
    }
  }
}

// ==================== GENERATE QUIZ ATTEMPTS ====================
async function generateQuizAttempts() {
  console.log('Generating quiz attempts...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  let attemptId = 1;
  let answerId = 1;

  for (const quiz of tables.quiz) {
    const quizQuestions = tables.quiz_question.filter(qq => qq.quiz_id === quiz.id).sort((a, b) => a.display_order - b.display_order);
    if (quizQuestions.length === 0) continue;

    for (let a = 0; a < CONFIG.ATTEMPTS_PER_QUIZ; a++) {
      const user = pick(userIds);
      const startTime = randomDate(1, 30, 0, 23);
      const endTime = new Date(startTime.getTime() + randInt(2, 20) * 60000);
      const status = randInt(0, 2) === 0 ? 'completed' : 'in_progress';
      let score = 0;
      const maxScore = quizQuestions.length;

      const answers = [];
      for (const qq of quizQuestions) {
        const snapshot = qq.question_snapshot;
        const qType = snapshot.type;
        let answerJson = {};
        let isCorrect = false;

        // Generate plausible answer based on type
        if (qType === 'multiple_choice' || qType === 'single_choice') {
          const options = snapshot.metadata?.options || [];
          const correct = snapshot.metadata?.correctAnswers || [];
          const selected = correct.length > 0 ? correct[0] : (options[0]?.id || 'a');
          answerJson = { selected: [selected] };
          isCorrect = status === 'completed' ? randInt(0, 1) === 1 : null;
        } else if (qType === 'fill_blank') {
          const answers = snapshot.metadata?.answers || ['answer'];
          answerJson = { answers: [pick(answers)] };
          isCorrect = status === 'completed' ? randInt(0, 1) === 1 : null;
        } else if (qType === 'ordering') {
          const items = snapshot.metadata?.items || [];
          const order = items.map((_, i) => i + 1);
          if (status === 'completed') {
            // sometimes shuffle
            if (randInt(0, 1) === 1) order.reverse();
          }
          answerJson = { order };
          isCorrect = status === 'completed' ? randInt(0, 1) === 1 : null;
        } else if (qType === 'matching') {
          const pairs = snapshot.metadata?.pairs || [];
          const pairIds = pairs.map(p => p.id);
          const shuffled = randInt(0, 1) === 1 ? pairIds.reverse() : pairIds;
          answerJson = { pairs: shuffled };
          isCorrect = status === 'completed' ? randInt(0, 1) === 1 : null;
        } else if (qType === 'true_false') {
          const correct = snapshot.metadata?.correctAnswer || true;
          answerJson = { answer: status === 'completed' ? correct : !correct };
          isCorrect = status === 'completed' ? randInt(0, 1) === 1 : null;
        } else if (qType === 'flashcard') {
          answerJson = { remembered: randInt(0, 1) === 1 };
          isCorrect = status === 'completed' ? randInt(0, 1) === 1 : null;
        }

        if (isCorrect) score++;

        answers.push({
          id: answerId++,
          attempt_id: attemptId,
          quiz_question_id: qq.id,
          question_snapshot: snapshot,
          answer_json: answerJson,
          is_correct: isCorrect,
          created_at: endTime,
          updated_at: endTime
        });
      }

      tables.quiz_attempt.push({
        id: attemptId,
        user_id: user,
        quiz_id: quiz.id,
        start_time: startTime,
        end_time: status === 'completed' ? endTime : null,
        score: status === 'completed' ? score : null,
        max_score: maxScore,
        question_count: maxScore,
        status: status,
        created_at: startTime,
        updated_at: endTime
      });

      tables.quiz_attempt_answer.push(...answers);
      attemptId++;
    }
  }
}

// ==================== GENERATE QUIZ VIEWS ====================
function generateQuizViews() {
  console.log('Generating quiz views...');
  let viewId = 1;
  const userIds = tables.users.map(u => u.id);

  for (const quiz of tables.quiz) {
    const numViews = randInt(2, 6);
    for (let v = 0; v < numViews; v++) {
      const viewedAt = randomDate(1, 40, 0, 23);
      const viewedHour = new Date(viewedAt);
      viewedHour.setMinutes(0, 0, 0);
      tables.quiz_view.push({
        id: viewId++,
        quiz_id: quiz.id,
        ip_address: randomInet(),
        viewed_at: viewedAt,
        viewed_hour: viewedHour
      });
    }
  }
}

// ==================== GENERATE COMMENTS ====================
async function generateComments() {
  console.log('Generating comments...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  const targetTypes = ['quiz', 'source', 'question'];
  let commentId = 1;
  let historyId = 1;

  for (let i = 0; i < CONFIG.NUM_COMMENTS; i++) {
    const targetType = pick(targetTypes);
    let targetId;
    if (targetType === 'quiz') targetId = pick(tables.quiz.map(q => q.id));
    else if (targetType === 'source') targetId = pick(tables.source.map(s => s.id));
    else targetId = pick(tables.question.map(q => q.id));

    const user = pick(userIds);
    const content = await callLlama(
      `Write a short comment (1-2 sentences) from an English learner about a ${targetType}. It can be a question, praise, or clarification.`,
      false,
      100
    ).catch(() => `Comment ${i + 1} content.`);

    const existingCommentsForTarget = tables.comment
      .filter(c => c.target_type === targetType && c.target_id === targetId)
      .map(c => c.id);

    const parentId =
      existingCommentsForTarget.length > 0 && randInt(1, 10) > 7
        ? pick(existingCommentsForTarget)
        : null;

    const created = randomDate(1, 30, 0, 23);
    const edited = randInt(0, 2) === 0 ? null : randomDate(0, 5, 0, 23);
    const deleted = randInt(1, 10) > 8 ? randomDate(0, 2) : null;

    tables.comment.push({
      id: commentId,
      user_id: user,
      parent_id: parentId,
      target_type: targetType,
      target_id: targetId,
      content,
      deleted_at: deleted,
      edited_at: edited,
      created_at: created
    });

    tables.comment_history.push({
      id: historyId++,
      comment_id: commentId,
      content,
      edited_at: edited || created
    });

    commentId++;
  }
}

// ==================== GENERATE EXPLANATIONS ====================
async function generateExplanations() {
  console.log('Generating explanations...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  let expId = 1;

  for (let i = 0; i < CONFIG.NUM_EXPLANATIONS; i++) {
    const source = pick(tables.source);
    const user = randInt(0, 1) === 0 ? pick(userIds) : null;
    const content = await callLlama(`Write a short explanation (2-3 sentences) about a concept related to the source titled "${source.title}".`, false, 150).catch(() => `Explanation ${i+1}`);
    const textRange = {
      start: randInt(0, 50),
      end: randInt(51, 150),
      unit: 'characters',
      text: source.raw_text?.substring(0, 30) || 'sample text'
    };

    tables.explanation.push({
      id: expId++,
      user_id: user,
      source_id: source.id,
      text_range: textRange,
      content,
      author_type: user ? 'user' : 'system',
      editable: true,
      created_at: randomDate(1, 20, 8, 22),
      updated_at: randInt(0, 1) === 0 ? null : randomDate(0, 5, 8, 22)
    });
  }
}

// ==================== GENERATE FAVORITE ITEMS ====================
async function generateFavorites() {
  console.log('Generating favorites...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  const types = ['word', 'phrase', 'idiom', 'other'];

  for (let i = 0; i < CONFIG.NUM_FAVORITES; i++) {
    const user = pick(userIds);
    const text = await callLlama(`Generate a single English word, phrase, or idiom that a learner might want to save as a favorite.`, false, 30).catch(() => `favorite ${i+1}`);
    const type = pick(types);
    const note = randInt(0, 2) === 0 ? await callLlama(`Write a short note (one sentence) about why this item is useful: "${text}".`, false, 80).catch(() => `Note about ${text}`) : null;

    tables.favorite_item.push({
      id: i + 1,
      user_id: user,
      text,
      type,
      note,
      created_at: randomDate(1, 60, 0, 23),
      updated_at: randomDate(0, 15, 0, 23)
    });
  }
}

// ==================== GENERATE LLM LOGS ====================
function generateLlmLogs() {
  console.log('Generating LLM logs...');
  const userIds = tables.users.map(u => u.id);
  const requestTypes = ['explain', 'generate_questions', 'summarize', 'grammar_check'];
  const statuses = ['completed', 'failed', 'in_progress'];

  for (let i = 0; i < CONFIG.NUM_LLM_LOGS; i++) {
    const user = randInt(0, 3) === 0 ? null : pick(userIds);
    const requestType = pick(requestTypes);
    const status = pick(statuses);
    const prompt = `User requested ${requestType} about English learning.`;
    const response = status === 'completed' ? `Generated response for ${requestType}.` : null;
    const error = status === 'failed' ? 'LLM service unavailable' : null;
    const created = randomDate(1, 30, 0, 23);
    const completed = status === 'completed' ? new Date(created.getTime() + randInt(1, 10) * 1000) : null;

    tables.llm_log.push({
      id: i + 1,
      user_id: user,
      request_type: requestType,
      prompt,
      response,
      tokens_used: status === 'completed' ? randInt(50, 500) : null,
      created_at: created,
      job_id: randomUuid(),
      status,
      completed_at: completed,
      error
    });
  }
}

// ==================== GENERATE METRICS ====================
function generateMetrics() {
  console.log('Generating metrics...');
  const metricNames = ['quiz_created', 'quiz_attempt_completed', 'source_uploaded', 'comment_added', 'user_active', 'latency_avg', 'requests'];

  for (let i = 0; i < CONFIG.NUM_METRICS; i++) {
    const name = pick(metricNames);
    const timestamp = randomDate(1, 60, 0, 23);
    const value = name.includes('latency') ? rng() * 1000 : randInt(1, 100);
    const tags = { env: 'seed', region: pick(['asia', 'us', 'eu']) };

    tables.metrics.push({
      id: i + 1,
      name,
      timestamp,
      value,
      tags
    });
  }
}

// ==================== GENERATE ADMIN LOGS ====================
function generateAdminLogs() {
  console.log('Generating admin logs...');
  const actions = ['ban_user', 'enable_quiz', 'disable_quiz', 'review_report', 'approve_quiz'];
  const targetTypes = ['user', 'quiz', 'comment', 'report'];

  for (let i = 0; i < CONFIG.NUM_ADMIN_LOGS; i++) {
    const action = pick(actions);
    const targetType = pick(targetTypes);
    let targetId;
    if (targetType === 'user') targetId = pick(tables.users.map(u => u.id));
    else if (targetType === 'quiz') targetId = pick(tables.quiz.map(q => q.id));
    else if (targetType === 'comment') targetId = pick(tables.comment.map(c => c.id));
    else targetId = randInt(1, 10);

    tables.admin_log.push({
      id: i + 1,
      admin_id: 1, // admin user
      action,
      target_type: targetType,
      target_id: targetId,
      details: randInt(0, 1) === 0 ? null : { reason: `Admin performed ${action}` },
      created_at: randomDate(1, 30, 8, 20)
    });
  }
}

// ==================== GENERATE REPORTS ====================
function generateReports() {
  console.log('Generating reports...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  const targetTypes = ['quiz', 'question', 'comment', 'quiz_question'];
  let reportId = 1;

  for (let i = 0; i < CONFIG.NUM_REPORTS; i++) {
    const targetType = pick(targetTypes);
    let targetId;
    if (targetType === 'quiz') targetId = pick(tables.quiz.map(q => q.id));
    else if (targetType === 'question') targetId = pick(tables.question.map(q => q.id));
    else if (targetType === 'comment') targetId = pick(tables.comment.map(c => c.id));
    else targetId = pick(tables.quiz_question.map(qq => qq.id));

    const user = pick(userIds);
    const reason = `Report reason ${i+1}`;
    const resolved = randInt(0, 2) === 0;
    const resolvedBy = resolved ? 1 : null;
    const resolvedAt = resolved ? randomDate(0, 5) : null;
    const attemptId = targetType === 'quiz_question' ? pick(tables.quiz_attempt.map(a => a.id)) : null;

    tables.report.push({
      id: reportId++,
      user_id: user,
      target_type: targetType,
      target_id: targetId,
      reason,
      resolved,
      resolved_by: resolvedBy,
      resolved_at: resolvedAt,
      created_at: randomDate(1, 20, 0, 23),
      attempt_id: attemptId
    });
  }
}

// ==================== GENERATE SESSIONS ====================
function generateSessions() {
  console.log('Generating sessions...');
  const userIds = tables.users.map(u => u.id);

  for (let i = 0; i < CONFIG.NUM_SESSIONS; i++) {
    const user = pick(userIds);
    const created = randomDate(1, 30, 0, 23);
    const expires = new Date(created.getTime() + randInt(1, 14) * 24 * 60 * 60 * 1000);
    const revoked = randInt(0, 4) === 0;

    tables.sessions.push({
      id: randomUuid(),
      user_id: user,
      token_hash: crypto.randomBytes(32).toString('base64'),
      created_at: created,
      expires_at: expires,
      revoked,
      ip_address: randomInet(),
      user_agent: pick([
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      ])
    });
  }
}

// ==================== GENERATE USER SOURCE PROGRESS ====================
function generateUserSourceProgress() {
  console.log('Generating user source progress...');
  const userIds = tables.users.map(u => u.id).filter(id => id !== 1);
  const sourceIds = tables.source.map(s => s.id);
  let progressId = 1;

  for (let i = 0; i < CONFIG.NUM_USER_SOURCE_PROGRESS; i++) {
    const user = pick(userIds);
    const source = pick(sourceIds);
    const lastPosition = {
      scrollPercent: rng(),
      paragraphIndex: randInt(0, 20),
      lastRead: randomDate(0, 2, 0, 23).toISOString()
    };

    tables.user_source_progress.push({
      id: progressId++,
      user_id: user,
      source_id: source,
      last_position: JSON.stringify(lastPosition),
      updated_at: randomDate(0, 5, 0, 23)
    });
  }
}

// ==================== SQL GENERATION ====================
function generateTruncateStatements() {
  const statements = [];

  if (CONFIG.TRUNCATE) {
    const allTables = Object.keys(tables);
    statements.push('-- Truncate all tables');
    statements.push(`TRUNCATE TABLE ${allTables.map(t => `public.${t}`).join(', ')} RESTART IDENTITY CASCADE;`);
  } else if (CONFIG.RESET_SEQUENCES) {
    statements.push('-- Reset sequences');
    for (const table of Object.keys(tables)) {
      if (table === 'sessions' || table === 'quiz_view') continue;
      statements.push(`SELECT setval('public.${table}_id_seq', 1, false);`);
    }
  }

  return statements;
}

function rowToInsert(table, row, columns) {
  const cols = columns || Object.keys(row);
  const values = cols.map(c => sqlEscape(row[c]));
  return `INSERT INTO public.${table} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`;
}

function generateInserts() {
  const lines = [];
  
  // Order of insertion matters due to foreign keys
  const order = [
    'users',
    'tag',
    'daily_word',
    'source',
    'note',
    'question',
    'question_tag',
    'quiz',
    'quiz_tag',
    'quiz_source',
    'quiz_note',
    'quiz_question',
    'quiz_attempt',
    'quiz_attempt_answer',
    'quiz_view',
    'comment',
    'comment_history',
    'explanation',
    'favorite_item',
    'llm_log',
    'metrics',
    'admin_log',
    'report',
    'sessions',
    'user_source_progress'
  ];

  for (const table of order) {
    if (tables[table] && tables[table].length > 0) {
      lines.push(`-- ${table}`);
      for (const row of tables[table]) {
        lines.push(rowToInsert(table, row));
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

// ==================== MAIN ====================
async function main() {
  console.log('Starting seed data generation...');
  console.log(`Using LLM at ${CONFIG.LLAMA_BASE_URL}, mode: ${CONFIG.BATCH_MODE}`);

  // Generate all data in dependency order
  await generateUsers();
  await generateTags();
  await generateDailyWords();
  await generateSources();
  await generateNotes();
  await generateQuestions();
  await generateQuizzes();
  await generateQuizQuestions();
  await generateQuizAttempts();
  generateQuizViews();
  await generateComments();
  await generateExplanations();
  await generateFavorites();
  generateLlmLogs();
  generateMetrics();
  generateAdminLogs();
  generateReports();
  generateSessions();
  generateUserSourceProgress();

  // Write SQL file
  const sqlLines = [
    'BEGIN;',
    '',
    ...generateTruncateStatements(),
    '',
    generateInserts(),
    'COMMIT;'
  ];

  const sql = sqlLines.join('\n');
  fs.writeFileSync(CONFIG.OUT_FILE, sql, 'utf8');

  console.log(`\nSeed SQL written to ${CONFIG.OUT_FILE}`);
  console.log('Row counts:');
  Object.entries(tables).forEach(([table, rows]) => {
    if (rows.length > 0) console.log(`  ${table}: ${rows.length}`);
  });
  console.log('\nDone.');
}

// Run
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}