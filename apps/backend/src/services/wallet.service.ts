import { Keypair, StrKey } from '@stellar/stellar-sdk';
import jwt from 'jsonwebtoken';
import { supabase } from '@/config/supabase.js';
import type { ServiceResponse } from './index.js';

export interface ChallengeResponse {
  challenge: string;
}

export interface VerifyResponse {
  token: string;
  address: string;
}

const CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export class WalletAuthService {
  async generateChallenge(address: string): Promise<ServiceResponse<ChallengeResponse>> {
    if (!StrKey.isValidEd25519PublicKey(address)) {
      return { success: false, error: 'Invalid Stellar address' };
    }

    try {
      // Generate a random challenge
      const challenge = Keypair.random().publicKey();
      const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY);

      // Store challenge in database
      const { error } = await supabase.from('wallet_challenges').insert({
        address,
        challenge,
        expires_at: expiresAt.toISOString(),
      });

      if (error) {
        return { success: false, error: 'Failed to generate challenge' };
      }

      return { success: true, data: { challenge } };
    } catch (err) {
      return { success: false, error: 'Challenge generation failed' };
    }
  }

  async verifySignature(
    address: string,
    challenge: string,
    signature: string,
  ): Promise<ServiceResponse<VerifyResponse>> {
    if (!StrKey.isValidEd25519PublicKey(address)) {
      return { success: false, error: 'Invalid Stellar address' };
    }

    try {
      // Retrieve challenge from database
      const { data: challengeData, error: fetchError } = await supabase
        .from('wallet_challenges')
        .select('*')
        .eq('address', address)
        .eq('challenge', challenge)
        .single();

      if (fetchError || !challengeData) {
        return { success: false, error: 'Challenge not found or expired' };
      }

      // Check if challenge is expired
      if (new Date(challengeData.expires_at) < new Date()) {
        return { success: false, error: 'Challenge expired' };
      }

      // Verify signature
      try {
        const keypair = Keypair.fromPublicKey(address);
        const signatureBuffer = Buffer.from(signature, 'base64');
        const challengeBuffer = Buffer.from(challenge);

        keypair.verify(challengeBuffer, signatureBuffer);
      } catch (err) {
        return { success: false, error: 'Invalid signature' };
      }

      // Delete used challenge
      await supabase
        .from('wallet_challenges')
        .delete()
        .eq('id', challengeData.id);

      // Generate JWT token
      const token = jwt.sign(
        { address, type: 'wallet' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' },
      );

      // Create or update user profile
      const { error: upsertError } = await supabase.from('profiles').upsert({
        stellar_address: address,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        return { success: false, error: 'Failed to create user profile' };
      }

      return { success: true, data: { token, address } };
    } catch (err) {
      return { success: false, error: 'Verification failed' };
    }
  }
}
