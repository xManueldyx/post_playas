import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import './queue/worker';
import './jobs/scheduler';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});