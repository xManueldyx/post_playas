import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { authRouter } from './routes/auth';
import { socialRouter } from './routes/socials';
import { postRouter } from './routes/posts';
import { uploadRouter } from './routes/uploads';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? 'https://backend-random.trycloudflare.com',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/uploads', uploadRouter);
app.use('/api/socials', socialRouter);
app.use('/api/posts', postRouter);

app.use(errorHandler);

export { app };
