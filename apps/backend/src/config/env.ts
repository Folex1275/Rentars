import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REDIS_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  STELLAR_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  STELLAR_RPC_URL: z.string().url().optional(),
  PROPERTY_LISTING_CONTRACT_ID: z.string().optional(),
  BOOKING_CONTRACT_ID: z.string().optional(),
  TRUSTLESS_WORK_API_URL: z.string().url().optional(),
  TRUSTLESS_WORK_API_KEY: z.string().optional(),
  GEOCODING_API_KEY: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnv(): Environment {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    const missingVars = result.error.errors
      .filter((e) => e.code === 'invalid_type' || e.message.includes('required'))
      .map((e) => e.path.join('.'))
      .filter((v, i, a) => a.indexOf(v) === i);
    
    const otherErrors = result.error.errors
      .filter((e) => !(e.code === 'invalid_type' || e.message.includes('required')))
      .map((e) => `${e.path.join('.')}: ${e.message}`);
    
    let errorMessage = 'Environment validation failed:\n';
    
    if (missingVars.length > 0) {
      errorMessage += `\nMissing required variables:\n${missingVars.map((v) => `  - ${v}`).join('\n')}`;
    }
    
    if (otherErrors.length > 0) {
      errorMessage += `\n\nInvalid values:\n${otherErrors.map((e) => `  - ${e}`).join('\n')}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return result.data;
}

export const env = validateEnv();
