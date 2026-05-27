import dotenv from 'dotenv';
dotenv.config();
import { app } from './app';
import './queue/worker';
import './jobs/scheduler';


const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
