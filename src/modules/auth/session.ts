import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { type User, type UserRole } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Get the current authenticated user or throw Unauthorized.
 * Syncs Supabase auth user with local users table on first access.
 */
export async function requireUser(): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    logger.auth("Authentication failed", { error: error?.message });
    throw new Error("Unauthorized");
  }

  logger.auth("User authenticated", { userId: user.id, email: user.email });

  // Sync or create local user record
  const localUser = await syncLocalUser(user.id, user.email!, user.user_metadata);

  return {
    id: localUser.id,
    email: localUser.email,
    role: localUser.role,
  };
}

/**
 * Get the current admin user or throw Forbidden.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return user;
}

/**
 * Try to get current user without throwing.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}

/**
 * Sync Supabase auth user with local users table.
 * Creates user and wallet if they don't exist.
 */
async function syncLocalUser(
  authUserId: string,
  email: string,
  metadata: Record<string, unknown> | undefined
): Promise<User> {
  // Check if user exists
  let localUser = await prisma.user.findUnique({
    where: { id: authUserId },
  });

  if (!localUser) {
    // Create local user
    localUser = await prisma.user.create({
      data: {
        id: authUserId,
        email,
        fullName: (metadata?.full_name as string) || null,
        role: "user",
        authProvider: "supabase",
        authProviderUserId: authUserId,
      },
    });

    // Create wallet for new user
    await prisma.wallet.create({
      data: {
        userId: authUserId,
      },
    });
  }

  return localUser;
}
