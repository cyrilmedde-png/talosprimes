import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';

// Types locaux (en attendant que shared soit buildé)
type UserRole = 'super_admin' | 'admin' | 'collaborateur' | 'lecture_seule';

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash un mot de passe
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Vérifie un mot de passe
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Génère un access token JWT
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    } as SignOptions
  );
}

/**
 * Génère un refresh token JWT
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions
  );
}

/**
 * Vérifie et décode un access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
}

/**
 * Vérifie et décode un refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Refresh token invalide ou expiré');
  }
}

/**
 * Authentifie un utilisateur avec email et mot de passe
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{
  user: {
    id: string;
    email: string;
    role: UserRole;
    tenantId: string;
  };
  tokens: AuthTokens;
}> {
  // Trouver l'utilisateur
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      tenant: {
        select: {
          id: true,
          statut: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('Email ou mot de passe incorrect');
  }

  // Vérifier que le tenant est actif
  if (user.tenant.statut !== 'actif') {
    throw new Error('Votre compte entreprise est suspendu ou résilié');
  }

  // Vérifier que l'utilisateur est actif
  if (user.statut !== 'actif') {
    throw new Error('Votre compte utilisateur est inactif');
  }

  // Vérifier le mot de passe
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Email ou mot de passe incorrect');
  }

  // Mettre à jour la dernière connexion
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Générer les tokens
  const payload: JWTPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  };

  const tokens: AuthTokens = {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    },
    tokens,
  };
}

