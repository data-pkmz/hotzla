import { Role } from '@prisma/client';
import type { User } from 'shared-types';
import { prisma } from '../config/db';

export class AuthService {
  async getOrCreateUser(adUsername: string): Promise<User> {
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

  async switchUserRole(adUsername: string, role: Role): Promise<User> {
    const user = await this.getOrCreateUser(adUsername);

    return prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        role,
      },
    });
  }
}
