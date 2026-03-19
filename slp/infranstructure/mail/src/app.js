import express from 'express';
import { config } from './config.js';
import { ResendProvider } from './providers/resendProvider.js';
import { EmailService } from './services/emailService.js';
import { HealthService } from './services/healthService.js';
import { EmailController } from './controllers/emailController.js';
import { HealthController } from './controllers/healthController.js';

export const app = express();

// Middleware
app.use(express.json());

// Dependencies
const emailProvider = new ResendProvider(config.resendApiKey);
const emailService = new EmailService(emailProvider);
const healthService = new HealthService();

// Controllers
const emailController = new EmailController(emailService);
const healthController = new HealthController(healthService);

// Routes
app.post('/send-email', (req, res) => emailController.sendEmail(req, res));
app.get('/health', (req, res) => healthController.check(req, res));