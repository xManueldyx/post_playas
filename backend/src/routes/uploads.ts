import { Router, Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

const uploadRouter = Router();
const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, uploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const mediaTypes = ['image/', 'video/'];
    if (mediaTypes.some((type) => file.mimetype.startsWith(type))) {
      cb(null, true);
      return;
    }
    cb(new Error('Solo se permiten imágenes y videos.')); // Remove unsupported files like PDF
  },
  limits: {
    fileSize: 40 * 1024 * 1024, // 40 MB max
  },
});

uploadRouter.post('/', upload.single('media'), (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ error: 'Archivo no proporcionado' });
  }

  const url = `/uploads/${file.filename}`;
  res.status(201).json({ url });
});

export { uploadRouter };