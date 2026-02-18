import { db } from '../../config/db.js';
import { preferences, users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Preferences Repository
 * Handles all database operations for user preferences
 */

export const getPreferencesByUserId = async (userId) => {
    try {
        const [userPreferences] = await db
            .select()
            .from(preferences)
            .where(eq(preferences.userId, userId))
            .limit(1);

        return userPreferences || null;
    } catch (error) {
        throw new Error(`Failed to get preferences: ${error.message}`);
    }
};

export const getPreferencesByClerkId = async (clerkUserId) => {
    try {
        const result = await db
            .select({
                preferences: preferences,
                user: users,
            })
            .from(preferences)
            .innerJoin(users, eq(preferences.userId, users.id))
            .where(eq(users.clerkUserId, clerkUserId))
            .limit(1);

        return result.length ? result[0].preferences : null;
    } catch (error) {
        throw new Error(`Failed to get preferences by Clerk ID: ${error.message}`);
    }
};

export const updatePreferences = async (userId, updateData) => {
    try {
        console.log('🗃️ Repository updatePreferences called with:');
        console.log('  userId:', userId);
        console.log('  updateData:', JSON.stringify(updateData, null, 2));
        console.log('  defaultStrategy in updateData:', updateData.defaultStrategy);

        const [updatedPreferences] = await db
            .update(preferences)
            .set({
                ...updateData,
                updatedAt: new Date(),
                version: updateData.version ? updateData.version + 1 : 1,
            })
            .where(eq(preferences.userId, userId))
            .returning();

        console.log('✅ Repository update result:', JSON.stringify(updatedPreferences, null, 2));
        console.log('🎯 defaultStrategy in result:', updatedPreferences.defaultStrategy);

        return updatedPreferences;
    } catch (error) {
        console.error('💥 Repository update error:', error);
        throw new Error(`Failed to update preferences: ${error.message}`);
    }
};

export const createPreferences = async (userId, preferencesData = {}) => {
    try {
        const [newPreferences] = await db
            .insert(preferences)
            .values({
                userId,
                uiMode: preferencesData.theme || 'light',
                notificationsEnabled: preferencesData.taskRemindersEnabled ?? true,
                leadMinutes: parseInt(preferencesData.leadMinutes) || 30,
                minGapMinutes: parseInt(preferencesData.defaultMinGap) || 15,
                maxWorkHoursPerDay: parseInt(preferencesData.defaultMaxWorkingHours) || 8,
                weekendPolicy: 'allow',
                defaultStrategy: preferencesData.defaultStrategy || 'earliest-fit',
                nickname: preferencesData.nickname || null,
            })
            .returning();

        return newPreferences;
    } catch (error) {
        throw new Error(`Failed to create preferences: ${error.message}`);
    }
};

export const resetPreferences = async (userId) => {
    try {
        const [resetPreferences] = await db
            .update(preferences)
            .set({
                uiMode: 'light',
                notificationsEnabled: true,
                leadMinutes: 30,
                minGapMinutes: 15,
                maxWorkHoursPerDay: 8,
                weekendPolicy: 'allow',
                defaultStrategy: 'earliest-fit',
                nickname: null,
                updatedAt: new Date(),
                version: 1,
            })
            .where(eq(preferences.userId, userId))
            .returning();

        return resetPreferences;
    } catch (error) {
        throw new Error(`Failed to reset preferences: ${error.message}`);
    }
};
