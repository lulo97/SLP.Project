import express from 'express';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { ResendProvider } from './providers/resendProvider.js';
import { EmailService } from './services/emailService.js';
import { HealthService } from './services/healthService.js';
import { EmailController } from './controllers/emailController.js';
import { HealthController } from './controllers/healthController.js';

export const app = express();

// 1. Rate Limiting (Protects against high traffic/DOS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.use(limiter);
app.use(express.json());

// Dependencies
const emailProvider = new ResendProvider(config.resendApiKey);
const emailService = new EmailService(emailProvider);
const healthService = new HealthService();

// Controllers
const emailController = new EmailController(emailService);
const healthController = new HealthController(healthService);

// Routes
// We wrap these to ensure async errors are caught
app.post('/send-email', (req, res, next) => emailController.sendEmail(req, res, next));
app.get('/health', (req, res) => healthController.check(req, res));

// 2. Global Error Handler (Prevents Process Crash)
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  
  // Handle JSON Syntax Errors specifically
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Invalid JSON format' });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});