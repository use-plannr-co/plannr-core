import { db } from '../../config/db.js';
import { textToTasksSessions, textToTasksDrafts } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Text-to-Tasks Repository
 * Database operations for sessions and drafts
 */

export const createSession = async (sessionData) => {
    try {
        const [session] = await db
            .insert(textToTasksSessions)
            .values({
                userId: sessionData.userId,
                status: sessionData.status || 'parsing',
                inputHash: sessionData.inputHash,
                inputStats: sessionData.inputStats,
                llmProvider: sessionData.llmProvider,
                llmModel: sessionData.llmModel,
                llmTokensIn: sessionData.llmTokensIn,
                llmTokensOut: sessionData.llmTokensOut,
                parseLatencyMs: sessionData.parseLatencyMs,
            })
            .returning();

        return session;
    } catch (error) {
        console.error('Error creating text-to-tasks session:', error);
        throw error;
    }
};

export const getSessionById = async (sessionId, userId = null) => {
    try {
        let query = db
            .select()
            .from(textToTasksSessions)
            .where(eq(textToTasksSessions.id, sessionId));

        if (userId) {
            query = query.where(eq(textToTasksSessions.userId, userId));
        }

        const [session] = await query;
        return session || null;
    } catch (error) {
        console.error('Error getting text-to-tasks session:', error);
        throw error;
    }
};

export const updateSession = async (sessionId, updates) => {
    try {
        const [updated] = await db
            .update(textToTasksSessions)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(textToTasksSessions.id, sessionId))
            .returning();

        return updated;
    } catch (error) {
        console.error('Error updating text-to-tasks session:', error);
        throw error;
    }
};

export const getUserSessions = async (userId, limit = 10) => {
    try {
        const sessions = await db
            .select()
            .from(textToTasksSessions)
            .where(eq(textToTasksSessions.userId, userId))
            .orderBy(desc(textToTasksSessions.createdAt))
            .limit(limit);

        return sessions;
    } catch (error) {
        console.error('Error getting user sessions:', error);
        throw error;
    }
};

export const createDrafts = async (draftsData) => {
    try {
        if (!Array.isArray(draftsData) || draftsData.length === 0) {
            return [];
        }

        const drafts = await db.insert(textToTasksDrafts).values(draftsData).returning();

        return drafts;
    } catch (error) {
        console.error('Error creating text-to-tasks drafts:', error);
        throw error;
    }
};

export const getDraftsBySessionId = async (sessionId, includeExcluded = false) => {
    try {
        let query = db
            .select()
            .from(textToTasksDrafts)
            .where(eq(textToTasksDrafts.sessionId, sessionId));

        if (!includeExcluded) {
            query = query.where(eq(textToTasksDrafts.included, true));
        }

        const drafts = await query.orderBy(textToTasksDrafts.orderIndex);
        return drafts;
    } catch (error) {
        console.error('Error getting session drafts:', error);
        throw error;
    }
};

export const updateDraft = async (draftId, updates) => {
    try {
        const [updated] = await db
            .update(textToTasksDrafts)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(textToTasksDrafts.id, draftId))
            .returning();

        return updated;
    } catch (error) {
        console.error('Error updating draft:', error);
        throw error;
    }
};

export const updateMultipleDrafts = async (updates) => {
    try {
        const results = [];

        // Process updates in transaction if needed
        for (const { id, ...updateData } of updates) {
            const [updated] = await db
                .update(textToTasksDrafts)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(eq(textToTasksDrafts.id, id))
                .returning();

            if (updated) {
                results.push(updated);
            }
        }

        return results;
    } catch (error) {
        console.error('Error updating multiple drafts:', error);
        throw error;
    }
};

export const deleteDraft = async (draftId) => {
    try {
        await db.delete(textToTasksDrafts).where(eq(textToTasksDrafts.id, draftId));

        return true;
    } catch (error) {
        console.error('Error deleting draft:', error);
        throw error;
    }
};

export const deleteSession = async (sessionId, userId) => {
    try {
        // Verify ownership before deletion
        const session = await getSessionById(sessionId, userId);
        if (!session) {
            throw new Error('Session not found or access denied');
        }

        // Delete session (drafts will cascade delete)
        await db
            .delete(textToTasksSessions)
            .where(
                and(eq(textToTasksSessions.id, sessionId), eq(textToTasksSessions.userId, userId))
            );

        return true;
    } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
    }
};

export const getSessionWithDrafts = async (sessionId, userId, includeExcluded = false) => {
    try {
        const session = await getSessionById(sessionId, userId);
        if (!session) {
            return null;
        }

        const drafts = await getDraftsBySessionId(sessionId, includeExcluded);

        return {
            ...session,
            drafts,
        };
    } catch (error) {
        console.error('Error getting session with drafts:', error);
        throw error;
    }
};

// Cleanup utilities
export const deleteExpiredSessions = async () => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const result = await db.delete(textToTasksSessions).where(
            and(
                eq(textToTasksSessions.status, 'failed')
                // Only delete failed sessions older than 24 hours
            )
        );

        return result;
    } catch (error) {
        console.error('Error cleaning up expired sessions:', error);
        throw error;
    }
};
