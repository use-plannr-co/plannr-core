import * as repo from './chat.repo.js';
import { getSubscriptionByUserId } from '../subscriptions/subscriptions.repo.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import claudeClient from '../../services/grok/grokClient.js';
import { tools } from '../../services/grok/toolDefinitions.js';
import { executeTool } from '../../services/grok/toolExecutors.js';
import { buildSystemPrompt } from '../../services/grok/systemPrompt.js';

const FREE_DAILY_LIMIT = 5;

// ─── SSE Helper ───────────────────────────────────────────────────────────────

function writeSSE(res, eventType, data) {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function listChats(req, res, next) {
    try {
        const { userId } = req.auth;
        const chatList = await repo.getChats(userId);
        res.json({ success: true, data: { chats: chatList } });
    } catch (err) {
        next(err);
    }
}

export async function createChat(req, res, next) {
    try {
        const { userId } = req.auth;
        const { title } = req.validated?.body || req.body || {};
        const chat = await repo.createChat(userId, title || null);
        res.status(201).json({ success: true, data: { chat } });
    } catch (err) {
        next(err);
    }
}

export async function getChat(req, res, next) {
    try {
        const { userId } = req.auth;
        const { chatId } = req.validated?.params || req.params;

        const chat = await repo.getChatById(chatId, userId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

        const messages = await repo.getMessages(chatId);
        const usage = await repo.getTodayUsage(userId);

        res.json({ success: true, data: { chat, messages, dailyUsage: usage } });
    } catch (err) {
        next(err);
    }
}

export async function deleteChatById(req, res, next) {
    try {
        const { userId } = req.auth;
        const { chatId } = req.validated?.params || req.params;

        const chat = await repo.getChatById(chatId, userId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

        await repo.deleteChat(chatId, userId);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}

export async function sendMessage(req, res, next) {
    try {
        const { userId } = req.auth;
        const { chatId } = req.validated?.params || req.params;
        const { message, timezone } = req.validated?.body || req.body;
        const tz = timezone || 'UTC';

        console.log('[Chat] sendMessage called - userId:', userId, 'chatId:', chatId);

        // 1. Check subscription and rate limit
        const subscription = await getSubscriptionByUserId(userId);
        const isPro = subscription?.isPro === true;

        if (!isPro) {
            const usage = await repo.getTodayUsage(userId);
            if (usage && usage.messageCount >= FREE_DAILY_LIMIT) {
                return res.status(429).json({
                    success: false,
                    error: 'CHAT_RATE_LIMIT_EXCEEDED',
                    message: `You've reached your daily limit of ${FREE_DAILY_LIMIT} messages. Upgrade to Plannr Pro for unlimited chat.`,
                });
            }
        }

        // 2. Verify chat belongs to user
        const chat = await repo.getChatById(chatId, userId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

        // 3. Save user message
        await repo.insertMessage({ chatId, role: 'user', content: message });

        // 4. Auto-title on first message
        if (!chat.title) {
            await repo.updateChatTitle(chatId, message.slice(0, 60));
        }

        // 5. Increment daily usage
        await repo.incrementDailyUsage(userId);

        // 6. Build messages array from last 30 messages
        const storedMessages = await repo.getMessages(chatId, 30);
        const claudeMessages = buildClaudeMessages(storedMessages);

        // 7. Build system prompt
        const [userRow] = await db
            .select({ displayName: users.displayName })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        const systemPrompt = buildSystemPrompt({
            hasActiveSchedule: true, // optimistic; tools will handle the no-schedule case
            isPro,
            userName: userRow?.displayName || null,
            timezone: tz,
        });

        // 8. Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // 9. Run streaming loop
        await runStreamingLoop(res, claudeMessages, systemPrompt, userId, chatId, tz);
    } catch (err) {
        next(err);
    }
}

export async function submitActionResult(req, res, next) {
    try {
        const { userId } = req.auth;
        const { chatId } = req.validated?.params || req.params;
        const { actionType, summary, timezone } = req.validated?.body || req.body;
        const tz = timezone || 'UTC';

        const chat = await repo.getChatById(chatId, userId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

        // Save system message (NOT counted against daily usage)
        await repo.insertMessage({
            chatId,
            role: 'system',
            content: `[Action completed] ${actionType}: ${summary}`,
        });

        // Build Grok context
        const storedMessages = await repo.getMessages(chatId, 30);
        const claudeMessages = buildClaudeMessages(storedMessages);
        const [userRow] = await db
            .select({ displayName: users.displayName })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
        const subscription = await getSubscriptionByUserId(userId);
        const systemPrompt = buildSystemPrompt({
            hasActiveSchedule: true,
            isPro: subscription?.isPro === true,
            userName: userRow?.displayName || null,
            timezone: tz,
        });

        // Stream Grok's confirmation
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        await runStreamingLoop(res, claudeMessages, systemPrompt, userId, chatId, tz);
    } catch (err) {
        next(err);
    }
}

// ─── Streaming Loop ───────────────────────────────────────────────────────────

async function runStreamingLoop(res, messages, systemPrompt, userId, chatId, timezone) {
    try {
        const stream = await claudeClient.createStreamingMessage(messages, tools, systemPrompt);

        let accumulatedText = '';
        let finishReason = null;
        let inputTokens = 0;
        let outputTokens = 0;
        const toolCallsMap = {}; // keyed by index, accumulates streaming deltas

        for await (const chunk of stream) {
            const choice = chunk.choices[0];
            const delta = choice?.delta;

            if (delta?.content) {
                accumulatedText += delta.content;
                writeSSE(res, 'text_delta', { text: delta.content });
            }

            if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (!toolCallsMap[tc.index]) {
                        toolCallsMap[tc.index] = {
                            id: '',
                            type: 'function',
                            function: { name: '', arguments: '' },
                        };
                    }
                    if (tc.id) toolCallsMap[tc.index].id = tc.id;
                    if (tc.function?.name) toolCallsMap[tc.index].function.name += tc.function.name;
                    if (tc.function?.arguments)
                        toolCallsMap[tc.index].function.arguments += tc.function.arguments;
                }
            }

            if (choice?.finish_reason) finishReason = choice.finish_reason;
            if (chunk.usage) {
                inputTokens = chunk.usage.prompt_tokens || 0;
                outputTokens = chunk.usage.completion_tokens || 0;
            }
        }

        const toolCalls = Object.values(toolCallsMap);

        if (finishReason === 'tool_calls') {
            const textContent = accumulatedText;

            // Save assistant message with tool calls (OpenAI format)
            await repo.insertMessage({
                chatId,
                role: 'assistant',
                content: textContent,
                toolCalls,
                inputTokens,
                outputTokens,
            });

            // Execute each tool and collect results
            const toolResultContents = [];
            for (const toolCall of toolCalls) {
                const toolName = toolCall.function.name;
                const toolInput = JSON.parse(toolCall.function.arguments || '{}');

                writeSSE(res, 'tool_executing', { toolName });

                const result = await executeTool(toolName, toolInput, userId, timezone);
                const parsedResult = JSON.parse(result);

                writeSSE(res, 'tool_result', {
                    toolUseId: toolCall.id,
                    toolName,
                    result: parsedResult,
                });

                // For proposal tools: emit structured action proposal for button rendering
                if (
                    toolName.startsWith('propose_') &&
                    !parsedResult.error &&
                    parsedResult.count !== 0
                ) {
                    writeSSE(res, 'action_proposal', {
                        proposalId: toolCall.id,
                        actions: [parsedResult],
                    });
                }

                toolResultContents.push({ tool_call_id: toolCall.id, content: result });
            }

            // Save tool results as user-role message
            await repo.insertMessage({
                chatId,
                role: 'user',
                content: '',
                toolResults: toolResultContents,
            });

            // Extend the in-memory messages array rather than reloading from DB.
            // Reloading risks non-deterministic ordering when both inserts share the
            // same createdAt timestamp (they're inserted milliseconds apart).
            const assistantTurn = {
                role: 'assistant',
                content: textContent || null,
                tool_calls: toolCalls,
            };
            const toolResultTurns = toolResultContents.map((tr) => ({
                role: 'tool',
                tool_call_id: tr.tool_call_id,
                content: tr.content,
            }));
            await runStreamingLoop(
                res,
                [...messages, assistantTurn, ...toolResultTurns],
                systemPrompt,
                userId,
                chatId,
                timezone
            );
        } else {
            // end_turn — save final message and close
            await repo.insertMessage({
                chatId,
                role: 'assistant',
                content: accumulatedText,
                inputTokens,
                outputTokens,
            });
            await repo.touchChat(chatId);
            writeSSE(res, 'message_stop', { inputTokens, outputTokens });
            res.end();
        }
    } catch (err) {
        console.error('Streaming loop error:', err);
        writeSSE(res, 'error', { message: err.message || 'An error occurred' });
        res.end();
    }
}

// ─── Message Builder ──────────────────────────────────────────────────────────

/**
 * Converts stored DB messages to OpenAI API message format.
 * Handles: plain user/assistant messages, assistant messages with tool calls,
 * and user messages containing tool_result blocks.
 * Also handles legacy Anthropic-format tool calls/results from before the migration.
 */
function buildClaudeMessages(storedMessages) {
    const result = [];

    for (let i = 0; i < storedMessages.length; i++) {
        const msg = storedMessages[i];

        if (msg.role === 'user') {
            if (msg.toolResults && msg.toolResults.length > 0) {
                // Each tool result becomes a separate 'tool' message in OpenAI format.
                // Handle both legacy Anthropic format ({ type, tool_use_id, content })
                // and current OpenAI format ({ tool_call_id, content }).
                for (const tr of msg.toolResults) {
                    const toolCallId = tr.tool_call_id ?? tr.tool_use_id;
                    const content =
                        typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content);
                    result.push({ role: 'tool', tool_call_id: toolCallId, content });
                }
            } else {
                result.push({ role: 'user', content: msg.content });
            }
        } else if (msg.role === 'system') {
            // Map system action-result notifications to user role
            result.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
            if (msg.toolCalls && msg.toolCalls.length > 0) {
                // Only include tool_calls if the very next stored message has matching
                // tool_results. If not (e.g. a previous crash), emit text-only to keep
                // history valid and avoid "tool_calls without tool messages" API errors.
                const next = storedMessages[i + 1];
                const nextHasResults = next?.role === 'user' && next?.toolResults?.length > 0;

                if (nextHasResults) {
                    // Convert legacy Anthropic format if needed
                    const tool_calls = msg.toolCalls.map((tc) => {
                        if (tc.type === 'tool_use') {
                            return {
                                id: tc.id,
                                type: 'function',
                                function: { name: tc.name, arguments: JSON.stringify(tc.input) },
                            };
                        }
                        return tc; // already OpenAI format
                    });
                    result.push({ role: 'assistant', content: msg.content || null, tool_calls });
                } else {
                    // Orphaned tool_use — degrade to text-only
                    if (msg.content) result.push({ role: 'assistant', content: msg.content });
                }
            } else {
                result.push({ role: 'assistant', content: msg.content });
            }
        }
    }

    return result;
}
