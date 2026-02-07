import { z } from 'zod';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Schema de validation des variables d'environnement
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire au moins 32 caractères'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Server
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // CORS (pour production avec nom de domaine)
  CORS_ORIGIN: z.string().url().optional(),
  
  // n8n
  N8N_API_URL: z.string().url().optional(),
  N8N_API_KEY: z.string().optional(),
  N8N_USERNAME: z.string().optional(),
  N8N_PASSWORD: z.string().optional(),
  // Secret partagé pour permettre à n8n d'appeler l'API (sans JWT)
  // Header attendu: X-TalosPrimes-N8N-Secret: <secret>
  N8N_WEBHOOK_SECRET: z.string().optional(),
  // Activer l'utilisation de n8n pour les vues (listings/lecture)
  USE_N8N_VIEWS: z
    .string()
    .optional()
    .transform((v: string | undefined) => (v ? v.toLowerCase() === 'true' : false)),
  // Activer la délégation des écritures (create/update/delete) à n8n
  USE_N8N_COMMANDS: z
    .string()
    .optional()
    .transform((v: string | undefined) => (v ? v.toLowerCase() === 'true' : false)),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Redis
  REDIS_URL: z.string().url().optional(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
});

// Validation et export
export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ Erreur de configuration des variables d'environnement:");
    const issues = (error as unknown as { errors: Array<{ path: Array<string | number>; message: string }> })
      .errors;
    for (const issue of issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  throw error;
}

export { env };
