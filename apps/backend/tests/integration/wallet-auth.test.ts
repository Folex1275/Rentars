/**
 * Integration tests for wallet-based authentication
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Keypair } from '@stellar/stellar-sdk';
import { app } from '../src/index.js';

describe('Wallet Authentication', () => {
  let testKeypair: Keypair;
  let testAddress: string;

  beforeAll(() => {
    testKeypair = Keypair.random();
    testAddress = testKeypair.publicKey();
  });

  describe('POST /auth/wallet/challenge', () => {
    it('should generate a challenge for a valid Stellar address', async () => {
      const response = await fetch('http://localhost:3000/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: testAddress }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('challenge');
      expect(data).toHaveProperty('expiresAt');
      expect(data.challenge).toBeTruthy();
    });

    it('should reject invalid Stellar address', async () => {
      const response = await fetch('http://localhost:3000/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: 'invalid' }),
      });

      expect(response.status).toBe(422);
    });

    it('should reject missing stellar_address', async () => {
      const response = await fetch('http://localhost:3000/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(422);
    });
  });

  describe('POST /auth/wallet/verify', () => {
    it('should verify a signed challenge and return JWT', async () => {
      // Step 1: Get challenge
      const challengeRes = await fetch('http://localhost:3000/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: testAddress }),
      });

      const { challenge } = await challengeRes.json();

      // Step 2: Sign challenge
      const signature = testKeypair.sign(Buffer.from(challenge)).toString('base64');

      // Step 3: Verify signature
      const verifyRes = await fetch('http://localhost:3000/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stellar_address: testAddress,
          challenge,
          signature,
        }),
      });

      expect(verifyRes.status).toBe(200);
      const data = await verifyRes.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
    });

    it('should reject invalid signature', async () => {
      // Step 1: Get challenge
      const challengeRes = await fetch('http://localhost:3000/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: testAddress }),
      });

      const { challenge } = await challengeRes.json();

      // Step 2: Use wrong signature
      const wrongKeypair = Keypair.random();
      const signature = wrongKeypair.sign(Buffer.from(challenge)).toString('base64');

      // Step 3: Try to verify with wrong signature
      const verifyRes = await fetch('http://localhost:3000/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stellar_address: testAddress,
          challenge,
          signature,
        }),
      });

      expect(verifyRes.status).toBe(401);
    });

    it('should reject missing parameters', async () => {
      const response = await fetch('http://localhost:3000/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stellar_address: testAddress }),
      });

      expect(response.status).toBe(422);
    });
  });
});
