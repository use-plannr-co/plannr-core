import { z } from 'zod';

export const createChatSchema = z.object({
    title: z.string().max(100).optional(),
});

export const sendMessageSchema = z.object({
    message: z.string().min(1).max(2000),
});

export const chatIdParamSchema = z.object({
    chatId: z.string().uuid(),
});
