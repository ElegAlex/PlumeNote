// ===========================================
// Routes Authentification (EP-001)
// US-001: Connexion utilisateur
// US-002: Déconnexion
// ===========================================

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@plumenote/database';
import type { User, LoginResponse } from '@plumenote/types';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';
import { authenticateLdap } from '../services/ldap.js';
import { createAuditLog } from '../services/audit.js';

// ----- Schémas de validation -----

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ----- Rate limiting pour auth -----
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
    return { allowed: false, retryAfter: LOCK_DURATION_MS / 1000 };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string): void {
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  loginAttempts.set(key, record);

  // Nettoyage après succès ou expiration
  setTimeout(() => {
    loginAttempts.delete(key);
  }, LOCK_DURATION_MS);
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

// ----- Routes -----

export const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/v1/auth/login
   * US-001: Connexion utilisateur
   */
  app.post('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'Authenticate user',
      description: 'Authenticate with username/password (LDAP or local)',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                displayName: { type: 'string' },
                avatarUrl: { type: ['string', 'null'] },
                role: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    isSystem: { type: 'boolean' },
                    permissions: { type: 'object', additionalProperties: true },
                  },
                },
                isActive: { type: 'boolean' },
                lastLoginAt: { type: ['string', 'null'] },
                preferences: { type: ['object', 'null'], additionalProperties: true },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
            expiresAt: { type: 'string' },
            token: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        423: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            retryAfter: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'] || '';

    // Validation
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid credentials format',
      });
    }

    const { username, password } = parseResult.data;
    const rateLimitKey = `${ipAddress}:${username}`;

    // Vérification rate limit
    const rateLimitCheck = checkRateLimit(rateLimitKey);
    if (!rateLimitCheck.allowed) {
      await createAuditLog({
        action: 'AUTH_FAILED',
        resourceType: 'USER',
        details: { reason: 'RATE_LIMITED', username },
        ipAddress,
      });

      return reply.status(423).send({
        error: 'ACCOUNT_LOCKED',
        message: 'Compte temporairement verrouillé. Réessayez dans quelques minutes.',
        retryAfter: rateLimitCheck.retryAfter,
      });
    }

    try {
      let authenticated = false;
      let ldapUser: { email?: string; displayName?: string } | null = null;

      // Tentative d'authentification LDAP si activé
      if (config.ldap.enabled) {
        try {
          ldapUser = await authenticateLdap(username, password);
          authenticated = !!ldapUser;
        } catch (err) {
          logger.warn({ err, username }, 'LDAP authentication failed, falling back to local');
        }
      }

      // Récupérer l'utilisateur depuis la base
      const user = await prisma.user.findUnique({
        where: { username },
        include: { role: true },
      });

      // Si LDAP non activé ou échoué, tenter auth locale
      if (!authenticated && user?.password) {
        authenticated = await bcrypt.compare(password, user.password);
      }

      // Échec d'authentification
      if (!authenticated) {
        recordFailedAttempt(rateLimitKey);

        await createAuditLog({
          action: 'AUTH_FAILED',
          resourceType: 'USER',
          details: { reason: 'INVALID_CREDENTIALS', username },
          ipAddress,
        });

        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Identifiants incorrects',
        });
      }

      // Utilisateur non trouvé en base mais authentifié LDAP → créer le compte
      let dbUser = user;
      if (!dbUser && ldapUser) {
        const defaultRole = await prisma.role.findFirst({
          where: { name: 'reader' },
        });

        if (!defaultRole) {
          throw new Error('Default role not found');
        }

        dbUser = await prisma.user.create({
          data: {
            username,
            email: ldapUser.email || `${username}@plumenote.local`,
            displayName: ldapUser.displayName || username,
            roleId: defaultRole.id,
            isActive: true,
          },
          include: { role: true },
        });

        await createAuditLog({
          userId: dbUser.id,
          action: 'USER_CREATED',
          resourceType: 'USER',
          resourceId: dbUser.id,
          details: { source: 'LDAP' },
          ipAddress,
        });
      }

      if (!dbUser) {
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Identifiants incorrects',
        });
      }

      // Vérifier que le compte est actif
      if (!dbUser.isActive) {
        await createAuditLog({
          userId: dbUser.id,
          action: 'AUTH_FAILED',
          resourceType: 'USER',
          resourceId: dbUser.id,
          details: { reason: 'ACCOUNT_DISABLED' },
          ipAddress,
        });

        return reply.status(401).send({
          error: 'ACCOUNT_DISABLED',
          message: 'Votre compte est désactivé. Contactez l\'administrateur.',
        });
      }

      // Générer le token JWT
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 heures
      const token = app.jwt.sign(
        {
          userId: dbUser.id,
          username: dbUser.username,
          role: dbUser.role.name,
        },
        { expiresIn: config.jwtExpiresIn }
      );

      // Créer la session en base
      await prisma.session.create({
        data: {
          userId: dbUser.id,
          token,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Mettre à jour la date de dernière connexion
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      });

      // Clear rate limit
      clearAttempts(rateLimitKey);

      // Log d'audit
      await createAuditLog({
        userId: dbUser.id,
        action: 'AUTH_LOGIN',
        resourceType: 'USER',
        resourceId: dbUser.id,
        ipAddress,
      });

      // Set cookie httpOnly
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        path: '/',
        expires: expiresAt,
      });

      const response: LoginResponse & { token: string } = {
        user: {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          displayName: dbUser.displayName,
          avatarUrl: dbUser.avatarUrl,
          role: dbUser.role as User['role'],
          isActive: dbUser.isActive,
          lastLoginAt: dbUser.lastLoginAt?.toISOString() || null,
          preferences: dbUser.preferences as User['preferences'],
          createdAt: dbUser.createdAt.toISOString(),
          updatedAt: dbUser.updatedAt.toISOString(),
        },
        expiresAt: expiresAt.toISOString(),
        token, // Token JWT pour les connexions WebSocket
      };

      return response;
    } catch (err) {
      logger.error({ err, username }, 'Login error');
      throw err;
    }
  });

  /**
   * POST /api/v1/auth/logout
   * US-002: Déconnexion
   */
  app.post('/logout', {
    schema: {
      tags: ['Authentication'],
      summary: 'Logout user',
      description: 'Invalidate current session',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const token = request.cookies.token;

    if (token) {
      try {
        const decoded = app.jwt.verify<{ userId: string }>(token);

        // Supprimer la session
        await prisma.session.deleteMany({
          where: { token },
        });

        // Log d'audit
        await createAuditLog({
          userId: decoded.userId,
          action: 'AUTH_LOGOUT',
          resourceType: 'USER',
          resourceId: decoded.userId,
          ipAddress: request.ip,
        });
      } catch {
        // Token invalide, on continue
      }
    }

    // Supprimer le cookie
    reply.clearCookie('token', { path: '/' });

    return { success: true };
  });

  /**
   * GET /api/v1/auth/me
   * Récupérer l'utilisateur courant
   */
  app.get('/me', {
    schema: {
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Get authenticated user information',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: { role: true },
    });

    if (!user) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        preferences: user.preferences,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  });

  /**
   * POST /api/v1/auth/change-password
   * Changer le mot de passe de l'utilisateur connecté
   */
  app.post('/change-password', {
    schema: {
      tags: ['Authentication'],
      summary: 'Change password',
      description: 'Change current user password',
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: [app.authenticate],
  }, async (request, reply) => {
    const parseResult = changePasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: parseResult.error.errors[0]?.message || 'Invalid input',
      });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const userId = request.user.userId;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.status(401).send({
        error: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier que l'utilisateur a un mot de passe local (pas LDAP uniquement)
    if (!user.password) {
      return reply.status(400).send({
        error: 'NO_LOCAL_PASSWORD',
        message: 'Impossible de changer le mot de passe (authentification externe)',
      });
    }

    // Vérifier le mot de passe actuel
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      await createAuditLog({
        userId,
        action: 'PASSWORD_CHANGE_FAILED',
        resourceType: 'USER',
        resourceId: userId,
        details: { reason: 'INVALID_CURRENT_PASSWORD' },
        ipAddress: request.ip,
      });

      return reply.status(401).send({
        error: 'INVALID_PASSWORD',
        message: 'Mot de passe actuel incorrect',
      });
    }

    // Hasher et enregistrer le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log d'audit
    await createAuditLog({
      userId,
      action: 'PASSWORD_CHANGED',
      resourceType: 'USER',
      resourceId: userId,
      ipAddress: request.ip,
    });

    return {
      success: true,
      message: 'Mot de passe modifié avec succès',
    };
  });
};
