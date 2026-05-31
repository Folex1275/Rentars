import { describe, it, expect, beforeEach, mock } from 'bun:test';
import request from 'supertest';
import { app } from '../../src/index';
import { Keypair } from '@stellar/stellar-sdk';

describe('Wallet Authentication', () => {
  let testKeypair: Keypair;
  let testAddress: string;

  beforeEach(() => {
    testKeypair = Keypair.random();
    testAddress = testKeypair.publicKey();
  });

  describe('POST /auth/wallet/challenge', () => {
    it('should generate a challenge for a valid Stellar address', async () => {
      const response = await request(app)
        .post('/auth/wallet/challenge')
        .send({
          address: testAddress,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('challenge');
      expect(response.body.challenge).toBeString();
    });

    it('should reject an invalid Stellar address', async () => {
      const response = await request(app)
        .post('/auth/wallet/challenge')
        .send({
          address: 'invalid-address',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing address', async () => {
      const response = await request(app)
        .post('/auth/wallet/challenge')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/wallet/verify', () => {
    let challenge: string;

    beforeEach(async () => {
      // Generate a challenge first
      const challengeResponse = await request(app)
        .post('/auth/wallet/challenge')
        .send({
          address: testAddress,
        });

      challenge = challengeResponse.body.challenge;
    });

    it('should verify a valid signature', async () => {
      // Sign the challenge with the test keypair
      const signedChallenge = testKeypair.sign(Buffer.from(challenge)).toString('base64');

      const response = await request(app)
        .post('/auth/wallet/verify')
        .send({
          address: testAddress,
          challenge,
          signature: signedChallenge,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeString();
    });

    it('should reject an invalid signature', async () => {
      const invalidSignature = Buffer.from('invalid-signature').toString('base64');

      const response = await request(app)
        .post('/auth/wallet/verify')
        .send({
          address: testAddress,
          challenge,
          signature: invalidSignature,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject an expired challenge', async () => {
      // Create an old challenge (simulated by using a very old timestamp)
      const oldChallenge = 'expired-challenge-from-past';
      const signedChallenge = testKeypair.sign(Buffer.from(oldChallenge)).toString('base64');

      const response = await request(app)
        .post('/auth/wallet/verify')
        .send({
          address: testAddress,
          challenge: oldChallenge,
          signature: signedChallenge,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing signature', async () => {
      const response = await request(app)
        .post('/auth/wallet/verify')
        .send({
          address: testAddress,
          challenge,
          // missing signature
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject mismatched address', async () => {
      const otherKeypair = Keypair.random();
      const signedChallenge = otherKeypair.sign(Buffer.from(challenge)).toString('base64');

      const response = await request(app)
        .post('/auth/wallet/verify')
        .send({
          address: testAddress,
          challenge,
          signature: signedChallenge,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
