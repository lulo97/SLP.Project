import * as argon2 from 'argon2';

export class PasswordHasher {
  // Matches C# DegreesOfParallelism=8, Iterations=4, MemorySize=64MB
  private static readonly CONFIG = {
    parallelism: 8,
    timeCost: 4,
    memoryCost: 64 * 1024, // 64 MB
    hashLength: 32,        // Matches C# .GetBytes(32)
    type: argon2.argon2id
  };

  static async hash(password: string): Promise<string> {
    // 1. Generate a 16-byte random salt (Matches C# RandomNumberGenerator.GetBytes(16))
    const salt = require('crypto').randomBytes(16);

    // 2. Get the raw hash buffer
    const hashBuffer = await argon2.hash(password, {
      ...this.CONFIG,
      salt,
      raw: true, // This is key: it returns a Buffer instead of a PHC string
    });

    // 3. Format as Base64(salt).Base64(hash) to match C#
    return `${salt.toString('base64')}.${hashBuffer.toString('base64')}`;
  }

  static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const [saltBase64, hashBase64] = storedHash.split('.');
      if (!saltBase64 || !hashBase64) return false;

      const salt = Buffer.from(saltBase64, 'base64');
      const originalHash = Buffer.from(hashBase64, 'base64');

      // 4. Hash the incoming password using the extracted salt
      const newHash = await argon2.hash(password, {
        ...this.CONFIG,
        salt,
        raw: true,
      });

      // 5. Securely compare the buffers
      return require('crypto').timingSafeEqual(originalHash, newHash);
    } catch (error) {
      return false;
    }
  }
}