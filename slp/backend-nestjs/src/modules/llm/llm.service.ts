import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExplainRequest, GrammarCheckRequest } from './llm.dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>('LLM_API_BASE_URL') ?? "";
    this.temperature = this.config.get<number>('LLM_TEMPERATURE', 0.8);
    this.maxTokens = this.config.get<number>('LLM_MAX_TOKENS', -1);
    if (!this.baseUrl) {
      throw new Error('LLM_API_BASE_URL is not configured');
    }
  }

  // --- Prompt builders -------------------------------------------------

  buildExplainPrompt(request: ExplainRequest): string {
    const contextPart = request.context
      ? `\nContext: ${request.context}`
      : '';
    return `Please explain the following text clearly and concisely:${contextPart}\n\nText: ${request.selectedText}`;
  }

  buildGrammarCheckPrompt(request: GrammarCheckRequest): string {
    return `Please check and correct the grammar of the following text. Return only the corrected text without any explanation:\n\n${request.text}`;
  }

  // --- Core LLM call (streaming SSE) -----------------------------------

  async callLlmAsync(prompt: string): Promise<{ content: string; tokensUsed: number | null }> {
    const payload = {
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      return_progress: true,
      reasoning_format: 'auto',
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      dynatemp_range: 0,
      dynatemp_exponent: 1,
      top_k: 40,
      top_p: 0.95,
      min_p: 0.05,
      xtc_probability: 0,
      xtc_threshold: 0.1,
      typ_p: 1,
      repeat_last_n: 64,
      repeat_penalty: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      dry_multiplier: 0,
      dry_base: 1.75,
      dry_allowed_length: 2,
      dry_penalty_last_n: -1,
      samplers: [
        'penalties',
        'dry',
        'top_n_sigma',
        'top_k',
        'typ_p',
        'top_p',
        'min_p',
        'xtc',
        'temperature',
      ],
      timings_per_token: true,
    };

    this.logger.debug(`Sending streaming request to ${this.baseUrl}`);

    const response = await axios.post(this.baseUrl, payload, {
      responseType: 'stream',
      headers: { 'Content-Type': 'application/json' },
    });

    const stream = response.data;
    let content = '';
    let tokensUsed: number | null = null;

    // Parse SSE lines
    return new Promise((resolve, reject) => {
      let buffer = '';
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            // End of stream
            stream.destroy();
            resolve({ content, tokensUsed });
            return;
          }
          if (!data) continue;

          try {
            const json = JSON.parse(data);
            // Delta content
            const choices = json.choices;
            if (choices && choices[0]) {
              const delta = choices[0].delta || choices[0].message;
              if (delta && delta.content) {
                content += delta.content;
              }
            }
            // Token usage
            if (json.usage && json.usage.total_tokens) {
              tokensUsed = json.usage.total_tokens;
            }
          } catch (err) {
            this.logger.warn(`Skipping malformed SSE chunk: ${data}`, err);
          }
        }
      });

      stream.on('error', (err: any) => reject(err));
      stream.on('end', () => {
        // If we never got [DONE] but stream closed, resolve anyway
        resolve({ content, tokensUsed });
      });
    });
  }

  // --- Convenience wrappers (used by background processor) ------------

  async processExplainAsync(
    userId: number | null,
    request: ExplainRequest,
  ): Promise<string> {
    const prompt = this.buildExplainPrompt(request);
    const { content } = await this.callLlmAsync(prompt);
    return content;
  }

  async processGrammarCheckAsync(
    userId: number | null,
    request: GrammarCheckRequest,
  ): Promise<string> {
    const prompt = this.buildGrammarCheckPrompt(request);
    const { content } = await this.callLlmAsync(prompt);
    return content;
  }
}