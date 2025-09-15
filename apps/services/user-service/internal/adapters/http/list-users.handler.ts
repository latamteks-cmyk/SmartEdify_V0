import { Request, Response } from 'express';
import { db } from '../db/memory';

export async function listUsersHandler(_req: Request, res: Response) {
  return res.status(200).json({ items: db.users.map(u => ({ id: u.id, email: u.email, name: u.name })) });
}
