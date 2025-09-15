import { Request, Response } from 'express';
import { addUser, db } from '../db/memory';
import { v4 as uuidv4 } from 'uuid';


export async function createUserHandler(req: Request, res: Response) {
  const { email, name, password, id: customId } = req.body;
  const id = customId || uuidv4();
  addUser({ id, email, name, password });
  return res.status(201).json({ message: 'Usuario creado', user: { id, email, name } });
}
