import { BadRequestException } from '@nestjs/common';

type SupportedType = 'multiple_choice' | 'single_choice' | 'true_false' | 'fill_blank' | 'ordering' | 'matching' | 'flashcard';

interface Option {
  id: string;
  text: string;
}

interface MatchingPair {
  id: number;
  left: string;
  right: string;
}

interface OrderingItem {
  order_id: number;
  text: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface Metadata {
  options?: Option[];
  correctAnswers?: string[];
  correctAnswer?: boolean;
  keywords?: string[];
  answers?: string[];
  items?: OrderingItem[];
  pairs?: MatchingPair[];
  front?: string;
  back?: string;
}

export class QuestionValidationHelper {
  private static supportedTypes: SupportedType[] = [
    'multiple_choice',
    'single_choice',
    'true_false',
    'fill_blank',
    'ordering',
    'matching',
    'flashcard',
  ];

  static validateSnapshot(snapshot: any): void {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new BadRequestException('Question snapshot must be a valid object');
    }

    const { type, content, metadata } = snapshot;

    // Validate type
    if (!type || typeof type !== 'string') {
      throw new BadRequestException('Question snapshot must contain a string "type" field.');
    }
    if (!this.supportedTypes.includes(type as SupportedType)) {
      throw new BadRequestException(`Unsupported question type: '${type}'. Supported types: ${this.supportedTypes.join(', ')}.`);
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim() === '') {
      throw new BadRequestException('Question snapshot must contain a non-empty string "content" field.');
    }

    // Validate metadata
    if (!metadata || typeof metadata !== 'object') {
      throw new BadRequestException('Question snapshot must contain a "metadata" object.');
    }

    // Type-specific validation
    switch (type) {
      case 'multiple_choice':
        this.validateMultipleChoice(metadata);
        break;
      case 'single_choice':
        this.validateSingleChoice(metadata);
        break;
      case 'true_false':
        this.validateTrueFalse(metadata);
        break;
      case 'fill_blank':
        this.validateFillBlank(metadata, content);
        break;
      case 'ordering':
        this.validateOrdering(metadata);
        break;
      case 'matching':
        this.validateMatching(metadata);
        break;
      case 'flashcard':
        this.validateFlashcard(metadata);
        break;
    }
  }

  private static validateMultipleChoice(metadata: Metadata): void {
    const options = metadata.options;
    if (!options || !Array.isArray(options) || options.length === 0) {
      throw new BadRequestException('Multiple choice question must have a non-empty "options" array.');
    }
    const optionIds = new Set<string>();
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.id || typeof opt.id !== 'string' || opt.id.trim() === '') {
        throw new BadRequestException(`Multiple choice options[${i}] must have a non-empty string "id".`);
      }
      if (optionIds.has(opt.id)) {
        throw new BadRequestException(`Multiple choice options contain duplicate id: "${opt.id}".`);
      }
      optionIds.add(opt.id);
      if (!opt.text || typeof opt.text !== 'string' || opt.text.trim() === '') {
        throw new BadRequestException(`Multiple choice options[${i}] must have a non-empty string "text".`);
      }
    }

    const correctAnswers = metadata.correctAnswers;
    if (!correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length === 0) {
      throw new BadRequestException('Multiple choice question must have a non-empty "correctAnswers" array.');
    }
    for (let i = 0; i < correctAnswers.length; i++) {
      const ans = correctAnswers[i];
      if (typeof ans !== 'string' || ans.trim() === '') {
        throw new BadRequestException(`Multiple choice correctAnswers[${i}] must be a non-empty string.`);
      }
      if (!optionIds.has(ans)) {
        throw new BadRequestException(`Multiple choice correctAnswers references id "${ans}" which does not exist in options.`);
      }
    }
  }

  private static validateSingleChoice(metadata: Metadata): void {
    const options = metadata.options;
    if (!options || !Array.isArray(options) || options.length === 0) {
      throw new BadRequestException('Single choice question must have a non-empty "options" array.');
    }
    const optionIds = new Set<string>();
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.id || typeof opt.id !== 'string' || opt.id.trim() === '') {
        throw new BadRequestException(`Single choice options[${i}] must have a non-empty string "id".`);
      }
      if (optionIds.has(opt.id)) {
        throw new BadRequestException(`Single choice options contain duplicate id: "${opt.id}".`);
      }
      optionIds.add(opt.id);
      if (!opt.text || typeof opt.text !== 'string' || opt.text.trim() === '') {
        throw new BadRequestException(`Single choice options[${i}] must have a non-empty string "text".`);
      }
    }

    const correctAnswers = metadata.correctAnswers;
    if (!correctAnswers || !Array.isArray(correctAnswers) || correctAnswers.length !== 1) {
      throw new BadRequestException('Single choice question must have exactly one "correctAnswers" entry.');
    }
    const ans = correctAnswers[0];
    if (typeof ans !== 'string' || ans.trim() === '') {
      throw new BadRequestException('Single choice correctAnswers[0] must be a non-empty string.');
    }
    if (!optionIds.has(ans)) {
      throw new BadRequestException(`Single choice correctAnswers references id "${ans}" which does not exist in options.`);
    }
  }

  private static validateTrueFalse(metadata: Metadata): void {
    if (typeof metadata.correctAnswer !== 'boolean') {
      throw new BadRequestException('True/false question must have a boolean "correctAnswer" field.');
    }
  }

  private static validateFillBlank(metadata: Metadata, content: string): void {
    const keywords = metadata.keywords;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      throw new BadRequestException('Fill blank question must have a non-empty "keywords" array.');
    }
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      if (typeof kw !== 'string' || kw.trim() === '') {
        throw new BadRequestException(`Fill blank keywords[${i}] must be a non-empty string.`);
      }
      if (!content.toLowerCase().includes(kw.toLowerCase())) {
        throw new BadRequestException(`Fill blank keyword "${kw}" not found in content.`);
      }
    }
    // answers are optional but if provided must be non-empty strings
    const answers = metadata.answers;
    if (answers !== undefined) {
      if (!Array.isArray(answers) || answers.length === 0) {
        throw new BadRequestException('Fill blank "answers" if provided must be a non-empty array.');
      }
      for (let i = 0; i < answers.length; i++) {
        if (typeof answers[i] !== 'string' || answers[i].trim() === '') {
          throw new BadRequestException(`Fill blank answers[${i}] must be a non-empty string.`);
        }
      }
    }
  }

  private static validateOrdering(metadata: Metadata): void {
    const items = metadata.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Ordering question must have a non-empty "items" array.');
    }
    const orderIds = new Set<number>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item !== 'object' || item === null) {
        throw new BadRequestException(`Ordering items[${i}] must be an object.`);
      }
      if (typeof item.order_id !== 'number' || item.order_id < 1) {
        throw new BadRequestException(`Ordering items[${i}] must have an integer "order_id" >= 1.`);
      }
      if (orderIds.has(item.order_id)) {
        throw new BadRequestException(`Ordering items contains duplicate order_id: ${item.order_id}.`);
      }
      orderIds.add(item.order_id);
      if (typeof item.text !== 'string' || item.text.trim() === '') {
        throw new BadRequestException(`Ordering items[${i}] must have a non-empty string "text".`);
      }
    }
  }

  private static validateMatching(metadata: Metadata): void {
    const pairs = metadata.pairs;
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      throw new BadRequestException('Matching question must have a non-empty "pairs" array.');
    }
    const ids = new Set<number>();
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      if (typeof pair !== 'object' || pair === null) {
        throw new BadRequestException(`Matching pairs[${i}] must be an object.`);
      }
      if (typeof pair.id !== 'number' || pair.id < 1) {
        throw new BadRequestException(`Matching pairs[${i}] must have an integer "id" >= 1.`);
      }
      if (ids.has(pair.id)) {
        throw new BadRequestException(`Matching pairs contains duplicate id: ${pair.id}.`);
      }
      ids.add(pair.id);
      if (typeof pair.left !== 'string' || pair.left.trim() === '') {
        throw new BadRequestException(`Matching pairs[${i}] must have a non-empty string "left".`);
      }
      if (typeof pair.right !== 'string' || pair.right.trim() === '') {
        throw new BadRequestException(`Matching pairs[${i}] must have a non-empty string "right".`);
      }
    }
  }

  private static validateFlashcard(metadata: Metadata): void {
    const front = metadata.front;
    const back = metadata.back;
    if (typeof front !== 'string' || front.trim() === '') {
      throw new BadRequestException('Flashcard must have a non-empty string "front" in metadata.');
    }
    if (typeof back !== 'string' || back.trim() === '') {
      throw new BadRequestException('Flashcard must have a non-empty string "back" in metadata.');
    }
  }
}