import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import * as net from 'net';
import { IHealthCheckService } from './health-check.service.interface';
import { HealthCheckResponse, ServiceHealthDto } from './dto/health-response.dto';

@Injectable()
export class HealthCheckService implements IHealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly timeoutMs = 3000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getHealthStatus(): Promise<HealthCheckResponse> {
    const cached = await this.cacheManager.get<HealthCheckResponse>('health_status');
    if (cached) return cached;

    const checks: (() => Promise<ServiceHealthDto>)[] = [
      this.checkRedis.bind(this),
      this.checkMail.bind(this),
      this.checkBackend.bind(this),
      this.checkFrontend.bind(this),
      this.checkLlama.bind(this),
      this.checkPiperGateway.bind(this),
    ];

    const results = await Promise.allSettled(
      checks.map(async (check) => {
        try {
          return await this.withTimeout(check(), this.timeoutMs);
        } catch (err) {
          const name = this.extractName(check);
          return {
            name,
            status: 'Unhealthy',
            details: err instanceof Error ? err.message : String(err),
            responseTimeMs: this.timeoutMs,
          };
        }
      }),
    );

    const services = results
      .map((result) => (result.status === 'fulfilled' ? result.value : null))
      .filter((v): v is ServiceHealthDto => v !== null);

    const response: HealthCheckResponse = {
      timestamp: new Date(),
      services,
    };

    await this.cacheManager.set('health_status', response, 10000); // 10s TTL
    return response;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId!));
  }

  private extractName(fn: () => Promise<ServiceHealthDto>): string {
    const nameMap: Record<string, string> = {
      checkRedis: 'Redis',
      checkMail: 'Mail',
      checkBackend: 'Backend',
      checkFrontend: 'Frontend',
      checkLlama: 'Llama',
      checkPiperGateway: 'Piper Gateway',
    };
    const funcName = fn.name;
    return nameMap[funcName] || 'Unknown';
  }

  // ----- Individual checks -----

  private async checkRedis(): Promise<ServiceHealthDto> {
    const start = Date.now();
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) throw new Error('Redis URL not configured');

    let host = 'localhost';
    let port = 6379;
    if (redisUrl.startsWith('redis://')) {
      const parts = redisUrl.replace('redis://', '').split(':');
      host = parts[0];
      if (parts[1]) port = parseInt(parts[1], 10);
    }

    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('Timeout'));
      }, this.timeoutMs);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        const ms = Date.now() - start;
        socket.destroy();
        resolve({
          name: 'Redis',
          status: 'Healthy',
          details: `Connected to ${host}:${port}`,
          responseTimeMs: ms,
        });
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        const ms = Date.now() - start;
        reject(new Error(`Connection failed: ${err.message}`));
      });
    });
  }

  private async checkMail(): Promise<ServiceHealthDto> {
    const start = Date.now();
    const baseUrl = this.configService.get<string>('email.baseUrl');
    if (!baseUrl) throw new Error('Mail API base URL not configured');

    const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, { timeout: this.timeoutMs }),
      );
      const ms = Date.now() - start;
      if (response.status === 200) {
        return {
          name: 'Mail',
          status: 'Healthy',
          details: JSON.stringify(response.data),
          responseTimeMs: ms,
        };
      } else {
        return {
          name: 'Mail',
          status: 'Unhealthy',
          details: `HTTP ${response.status}`,
          responseTimeMs: ms,
        };
      }
    } catch (error) {
      const ms = Date.now() - start;
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  private async checkBackend(): Promise<ServiceHealthDto> {
    const start = Date.now();
    // Simulate a minimal delay (matching .NET's Task.Delay(1))
    await new Promise((resolve) => setTimeout(resolve, 1));
    const ms = Date.now() - start;
    return {
      name: 'Backend',
      status: 'Healthy',
      details: 'Self check OK',
      responseTimeMs: ms,
    };
  }

  private async checkFrontend(): Promise<ServiceHealthDto> {
    const start = Date.now();
    const baseUrl = this.configService.get<string>('frontend.baseUrl');
    if (!baseUrl) throw new Error('Frontend base URL not configured');

    try {
      const response = await firstValueFrom(
        this.httpService.get(baseUrl, { timeout: this.timeoutMs }),
      );
      const ms = Date.now() - start;
      if (response.status === 200) {
        return {
          name: 'Frontend',
          status: 'Healthy',
          details: `HTTP ${response.status}`,
          responseTimeMs: ms,
        };
      } else {
        return {
          name: 'Frontend',
          status: 'Degraded',
          details: `HTTP ${response.status}`,
          responseTimeMs: ms,
        };
      }
    } catch (error) {
      const ms = Date.now() - start;
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  private async checkLlama(): Promise<ServiceHealthDto> {
    const start = Date.now();
    const baseUrl = this.configService.get<string>('llmApi.baseUrl');
    if (!baseUrl) throw new Error('Llama API base URL not configured');

    let healthUrl: string;
    try {
      const url = new URL(baseUrl);
      healthUrl = `${url.protocol}//${url.host}/health`;
    } catch {
      throw new Error('Invalid Llama API base URL');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, { timeout: this.timeoutMs }),
      );
      const ms = Date.now() - start;
      if (response.status === 200) {
        return {
          name: 'Llama',
          status: 'Healthy',
          details: JSON.stringify(response.data),
          responseTimeMs: ms,
        };
      } else if (response.status === 503) {
        return {
          name: 'Llama',
          status: 'Degraded',
          details: 'Loading model (HTTP 503)',
          responseTimeMs: ms,
        };
      } else {
        return {
          name: 'Llama',
          status: 'Unhealthy',
          details: `HTTP ${response.status}`,
          responseTimeMs: ms,
        };
      }
    } catch (error) {
      const ms = Date.now() - start;
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  private async checkPiperGateway(): Promise<ServiceHealthDto> {
    const start = Date.now();
    const baseUrl = this.configService.get<string>('ttsApi.baseUrl');
    if (!baseUrl) throw new Error('TTS API base URL not configured');

    const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, { timeout: this.timeoutMs }),
      );
      const ms = Date.now() - start;
      if (response.status === 200) {
        return {
          name: 'Piper Gateway',
          status: 'Healthy',
          details: JSON.stringify(response.data),
          responseTimeMs: ms,
        };
      } else {
        return {
          name: 'Piper Gateway',
          status: 'Unhealthy',
          details: `HTTP ${response.status}`,
          responseTimeMs: ms,
        };
      }
    } catch (error) {
      const ms = Date.now() - start;
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }
}