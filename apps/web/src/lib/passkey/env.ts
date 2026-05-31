export const PASSKEY_ENV = {
  rpId: process.env.NEXT_PUBLIC_PASSKEY_RP_ID || 'localhost',
  rpName: process.env.NEXT_PUBLIC_PASSKEY_RP_NAME || 'Rentars',
  origin: process.env.NEXT_PUBLIC_PASSKEY_ORIGIN || 'http://localhost:3001',
};

export function getPasskeyConfig() {
  return {
    rp: {
      name: PASSKEY_ENV.rpName,
      id: PASSKEY_ENV.rpId,
    },
    user: {
      userVerification: 'preferred' as const,
    },
    attestation: 'none' as const,
  };
}
