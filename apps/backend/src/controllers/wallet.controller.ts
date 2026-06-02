import type { Request, Response } from 'express';
import { WalletAuthService } from '@/services/wallet.service.js';

const walletAuthService = new WalletAuthService();

export async function walletChallenge(req: Request, res: Response): Promise<void> {
  const { address } = req.body;

  const result = await walletAuthService.generateChallenge(address);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result.data);
}

export async function walletVerify(req: Request, res: Response): Promise<void> {
  const { address, challenge, signature } = req.body;

  const result = await walletAuthService.verifySignature(address, challenge, signature);

  if (!result.success) {
    res.status(401).json({ error: result.error });
    return;
  }

  res.json(result.data);
}
