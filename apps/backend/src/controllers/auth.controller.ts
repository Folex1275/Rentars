import type { Request, Response } from 'express';
import { loginUser, registerUser } from '../services/auth.service.js';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const result = await registerUser(email, password);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.status(201).json(result.data);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const result = await loginUser(email, password);

  if (!result.success) {
    res.status(401).json({ error: result.error });
    return;
  }

  res.json(result.data);
}
