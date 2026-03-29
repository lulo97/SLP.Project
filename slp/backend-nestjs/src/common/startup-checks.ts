import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { DataSource } from "typeorm";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";

export class StartupChecks {
  private readonly logger = new Logger(StartupChecks.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async checkDatabaseConnection(): Promise<void> {
    this.logger.log("Checking database connection...");

    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      const result = await queryRunner.query("SELECT 1 AS ok");

      if (
        !Array.isArray(result) ||
        result.length === 0 ||
        result[0]?.ok !== 1
      ) {
        throw new Error("Database query returned unexpected result");
      }

      this.logger.log("✓ Database connection successful");

      try {
        await this.dataSource.query("SELECT 1 FROM users LIMIT 1");
        this.logger.log("✓ Users table is accessible");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Users table may not exist yet: ${message}`);
      }
    } catch (err: unknown) {
      this.logger.error("✗ Database connection failed!");
      this.logger.error(
        "Please check: 1. PostgreSQL is running 2. DATABASE_URL is correct 3. Database exists",
      );

      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(message);

      process.exit(1);
    } finally {
      await queryRunner.release().catch(() => undefined);
    }
  }

  async checkLlmConnection(): Promise<void> {
    const completionsUrl = this.configService.get<string>("llmApi.baseUrl");
    console.log({completionsUrl})

    if (!completionsUrl) {
      this.logger.warn(
        "llmApi.baseUrl is not configured — skipping LLM health check",
      );
      return;
    }

    let healthUrl: string;
    try {
      const url = new URL(completionsUrl);
      healthUrl = `${url.protocol}//${url.host}/health`;
    } catch {
      this.logger.warn(
        "llmApi.baseUrl is not a valid URI — skipping LLM health check",
      );
      return;
    }

    this.logger.log(`Checking LLM server health at ${healthUrl} ...`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, { timeout: 10000 }),
      );

      if (response.status === 200) {
        this.logger.log(`✓ LLM server is ready (HTTP ${response.status})`);
      } else if (response.status === 503) {
        this.logger.warn(
          "⚠ LLM server is loading its model (HTTP 503) — requests will be served from cache until it is ready",
        );
      } else {
        this.logger.warn(
          `✗ LLM server returned unexpected HTTP ${response.status}`,
        );
      }
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<any>;
      const code = (err as NodeJS.ErrnoException)?.code;
      const message = err instanceof Error ? err.message : String(err);
      const status = axiosErr.response?.status;

      if (code === "ECONNABORTED" || message.includes("timeout")) {
        this.logger.warn(
          "✗ LLM health check timed out (>10 s) — server may still be loading",
        );
      } else if (code === "ECONNREFUSED" || status === 503) {
        this.logger.warn(
          `✗ LLM server is unreachable: ${message} — cached responses will be used`,
        );
      } else {
        this.logger.warn(`✗ LLM health check failed unexpectedly: ${message}`);
      }
    }
  }

  async checkTtsConnection(): Promise<void> {
    const baseUrl = this.configService.get<string>("ttsApi.baseUrl");

    if (!baseUrl) {
      this.logger.warn(
        "ttsApi.baseUrl is not configured — skipping TTS health check",
      );
      return;
    }

    const healthUrl = `${baseUrl.replace(/\/$/, "")}/health`;
    this.logger.log(`Checking TTS gateway health at ${healthUrl} ...`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(healthUrl, { timeout: 10000 }),
      );

      const body = JSON.stringify(response.data);

      if (response.status === 200) {
        this.logger.log(`✓ TTS gateway is reachable — ${body}`);
      } else {
        this.logger.warn(
          `✗ TTS gateway returned HTTP ${response.status}: ${body}`,
        );
      }
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      const message = err instanceof Error ? err.message : String(err);

      if (code === "ECONNABORTED" || message.includes("timeout")) {
        this.logger.warn("✗ TTS health check timed out (>10 s)");
      } else if (code === "ECONNREFUSED") {
        this.logger.warn(
          `✗ TTS gateway is unreachable: ${message} — cached audio will still be served`,
        );
      } else {
        this.logger.warn(`✗ TTS health check failed unexpectedly: ${message}`);
      }
    }
  }
}
