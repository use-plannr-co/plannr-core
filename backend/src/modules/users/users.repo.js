import { db } from '../../config/db.js';
import { users, preferences } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * User Repository
 * Handles all database operations for users
 */

export const createUser = async (userData) => {
    const { clerkUserId, email, displayName, avatarName } = userData;

    try {
        const [newUser] = await db
            .insert(users)
            .values({
                clerkUserId,
                email,
                displayName,
                avatarName,
            })
            .returning();

        return newUser;
    } catch (error) {
        throw new Error(`Failed to create user: ${error.message}`);
    }
};

export const getUserByClerkId = async (clerkUserId) => {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.clerkUserId, clerkUserId))
            .limit(1);

        return user || null;
    } catch (error) {
        throw new Error(`Failed to get user by Clerk ID: ${error.message}`);
    }
};

export const getUserById = async (userId) => {
    try {
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        return user || null;
    } catch (error) {
        throw new Error(`Failed to get user by ID: ${error.message}`);
    }
};

export const updateUser = async (userId, updateData) => {
    try {
        const [updatedUser] = await db
            .update(users)
            .set({
                ...updateData,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        return updatedUser;
    } catch (error) {
        throw new Error(`Failed to update user: ${error.message}`);
    }
};

export const deleteUser = async (userId) => {
    try {
        await db.delete(users).where(eq(users.id, userId));

        return true;
    } catch (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
    }
};

export const getUserWithPreferences = async (userId) => {
    try {
        const result = await db
            .select({
                user: users,
                preferences: preferences,
            })
            .from(users)
            .leftJoin(preferences, eq(preferences.userId, users.id))
            .where(eq(users.id, userId))
            .limit(1);

        if (!result.length) return null;

        return {
            ...result[0].user,
            preferences: result[0].preferences,
        };
    } catch (error) {
        throw new Error(`Failed to get user with preferences: ${error.message}`);
    }
};

export const createDefaultPreferences = async (userId) => {
    try {
        const [newPreferences] = await db
            .insert(preferences)
            .values({
                userId,
                uiMode: 'system',
                notificationsEnabled: true,
                leadMinutes: 30,
                minGapMinutes: 15,
                maxWorkHoursPerDay: 8,
                weekendPolicy: 'allow',
            })
            .returning();

        return newPreferences;
    } catch (error) {
        throw new Error(`Failed to create default preferences: ${error.message}`);
    }
};

export const markUserAsOnboarded = async (userId) => {
    try {
        const [updatedUser] = await db
            .update(users)
            .set({
                onboarded: true,
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning();

        return updatedUser;
    } catch (error) {
        throw new Error(`Failed to mark user as onboarded: ${error.message}`);
    }
};
