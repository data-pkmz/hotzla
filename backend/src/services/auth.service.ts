import { Role } from '@prisma/client';
import type { User } from 'shared-types';

import { prisma } from '../config/db';

const USER_CACHE_TTL_MS = Number(process.env.AUTH_USER_CACHE_TTL_MS ?? 60_000);

interface CachedUser {
  user: User;
  expiresAt: number;
}

// Completed lookups.
const userCache = new Map<string, CachedUser>();

// Lookups currently in progress.
// Prevents several simultaneous requests for the same user from all
// performing the same database query.
const pendingUserLookups = new Map<string, Promise<User>>();

export class AuthService {
  /**
   * Retrieves an application user for the supplied AD username.
   *
   * Cached users are returned for up to 30 seconds to avoid performing
   * the same database lookup on every authenticated request.
   *
   * If no user exists yet, a new REQUESTER user is created.
   */
  async getOrCreateUser(adUsername: string): Promise<User> {
    const now = Date.now();

    const cached = userCache.get(adUsername);

    if (cached) {
      if (cached.expiresAt > now) {
        return cached.user;
      }

      // Remove expired entries when encountered.
      userCache.delete(adUsername);
    }

    // If another request is already loading this same user,
    // reuse that request rather than starting another DB query.
    const pendingLookup = pendingUserLookups.get(adUsername);

    if (pendingLookup) {
      return pendingLookup;
    }

    const lookupPromise = this.loadOrCreateUser(adUsername);

    pendingUserLookups.set(adUsername, lookupPromise);

    try {
      const user = await lookupPromise;

      userCache.set(adUsername, {
        user,
        expiresAt: Date.now() + USER_CACHE_TTL_MS,
      });

      return user;
    } finally {
      pendingUserLookups.delete(adUsername);
    }
  }

  /**
   * Loads an existing application user from the database or creates
   * a new REQUESTER user when one does not yet exist.
   */
  private async loadOrCreateUser(adUsername: string): Promise<User> {
    const existingUser = await prisma.user.findUnique({
      where: {
        adUsername,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    return prisma.user.create({
      data: {
        adUsername,
        role: 'REQUESTER',
      },
    });
  }

  /**
   * Changes a user's role and immediately updates the cached copy so
   * subsequent authorization checks see the new role.
   */
  async switchUserRole(adUsername: string, role: Role): Promise<User> {
    const user = await this.getOrCreateUser(adUsername);

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        role,
      },
    });

    userCache.set(adUsername, {
      user: updatedUser,
      expiresAt: Date.now() + USER_CACHE_TTL_MS,
    });

    return updatedUser;
  }

  /**
   * Removes a user's cached authorization data.
   *
   * Call this whenever user data that affects authorization is changed
   * somewhere outside this service, such as deactivation.
   */
  static invalidateUserCache(adUsername: string): void {
    userCache.delete(adUsername);
  }

  /**
   * Clears the complete user cache.
   *
   * Mainly useful for tests.
   */
  static clearUserCache(): void {
    userCache.clear();
    pendingUserLookups.clear();
  }
}
