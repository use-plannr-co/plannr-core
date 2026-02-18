import { z } from 'zod';

export const createChatSchema = z.object({
    title: z.string().max(100).optional(),
});

export const sendMessageSchema = z.object({
    message: z.string().min(1).max(2000),
    timezone: z.string().optional(), // IANA timezone string, e.g. "America/Vancouver"
});

export const chatIdParamSchema = z.object({
    chatId: z.string().uuid(),
});

export const actionResultSchema = z.object({
    actionType: z.enum(['missed_task_shift', 'add_task', 'strategy_switch']),
    summary: z.string().max(500),
    timezone: z.string().optional(),
});
