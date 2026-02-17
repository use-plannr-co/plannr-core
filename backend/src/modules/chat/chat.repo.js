import { db } from '../../config/db.js';
import { chats, chatMessages, chatDailyUsage } from '../../db/schema.js';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export async function createChat(userId, title = null) {
    const [chat] = await db.insert(chats).values({ userId, title }).returning();
    return chat;
}

export async function getChats(userId, limit = 20) {
    return db
        .select()
        .from(chats)
        .where(eq(chats.userId, userId))
        .orderBy(desc(chats.updatedAt))
        .limit(limit);
}

export async function getChatById(chatId, userId) {
    const [chat] = await db
        .select()
        .from(chats)
        .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
        .limit(1);
    return chat || null;
}

export async function updateChatTitle(chatId, title) {
    await db.update(chats).set({ title }).where(eq(chats.id, chatId));
}

export async function deleteChat(chatId, userId) {
    await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
}

export async function getMessages(chatId, limit = 50) {
    return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatId, chatId))
        .orderBy(asc(chatMessages.createdAt))
        .limit(limit);
}

export async function insertMessage({
    chatId,
    role,
    content,
    toolCalls = null,
    toolResults = null,
    inputTokens = null,
    outputTokens = null,
}) {
    const [message] = await db
        .insert(chatMessages)
        .values({
            chatId,
            role,
            content,
            toolCalls,
            toolResults,
            inputTokens,
            outputTokens,
        })
        .returning();
    return message;
}

export async function touchChat(chatId) {
    await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));
}

export async function getTodayUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    const [row] = await db
        .select()
        .from(chatDailyUsage)
        .where(and(eq(chatDailyUsage.userId, userId), eq(chatDailyUsage.date, today)))
        .limit(1);
    return row || null;
}

export async function incrementDailyUsage(userId) {
    const today = new Date().toISOString().split('T')[0];
    await db
        .insert(chatDailyUsage)
        .values({ userId, date: today, messageCount: 1 })
        .onConflictDoUpdate({
            target: [chatDailyUsage.userId, chatDailyUsage.date],
            set: { messageCount: sql`${chatDailyUsage.messageCount} + 1` },
        });
}
