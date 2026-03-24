import * as argon2 from 'argon2';

export class PasswordHasher {
  static async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024, // 64 MB
      timeCost: 4,
      parallelism: 8,
    });
  }

  static async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}