import * as repo from './chat.repo.js';
import { getSubscriptionByUserId } from '../subscriptions/subscriptions.repo.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import claudeClient from '../../services/claude/claudeClient.js';
import { tools } from '../../services/claude/toolDefinitions.js';
import { executeTool } from '../../services/claude/toolExecutors.js';
import { buildSystemPrompt } from '../../services/claude/systemPrompt.js';

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

        // 6. Build Anthropic messages array from last 30 messages
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
        const { actionType, summary } = req.validated?.body || req.body;

        const chat = await repo.getChatById(chatId, userId);
        if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

        // Save system message (NOT counted against daily usage)
        await repo.insertMessage({
            chatId,
            role: 'system',
            content: `[Action completed] ${actionType}: ${summary}`,
        });

        // Build Claude context
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
            timezone: 'UTC',
        });

        // Stream Claude's confirmation
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        await runStreamingLoop(res, claudeMessages, systemPrompt, userId, chatId, 'UTC');
    } catch (err) {
        next(err);
    }
}

// ─── Streaming Loop ───────────────────────────────────────────────────────────

async function runStreamingLoop(res, messages, systemPrompt, userId, chatId, timezone) {
    try {
        const stream = claudeClient.createStreamingMessage(messages, tools, systemPrompt);

        let accumulatedText = '';
        const toolCallsInProgress = {}; // keyed by content_block index
        let finalInputTokens = 0;
        let finalOutputTokens = 0;
        let stopReason = null;

        for await (const event of stream) {
            if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'tool_use') {
                    toolCallsInProgress[event.index] = {
                        id: event.content_block.id,
                        name: event.content_block.name,
                        inputJson: '',
                    };
                }
            }

            if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                    accumulatedText += event.delta.text;
                    writeSSE(res, 'text_delta', { text: event.delta.text });
                } else if (event.delta.type === 'input_json_delta') {
                    // event.index is the content_block index
                    if (toolCallsInProgress[event.index]) {
                        toolCallsInProgress[event.index].inputJson += event.delta.partial_json;
                    }
                }
            }

            if (event.type === 'message_delta') {
                stopReason = event.delta?.stop_reason;
                finalInputTokens = event.usage?.input_tokens || finalInputTokens;
                finalOutputTokens = event.usage?.output_tokens || finalOutputTokens;
            }
        }

        // Get final message for stop_reason and usage
        const finalMsg = await stream.finalMessage();
        stopReason = finalMsg.stop_reason;
        finalInputTokens = finalMsg.usage?.input_tokens || finalInputTokens;
        finalOutputTokens = finalMsg.usage?.output_tokens || finalOutputTokens;

        if (stopReason === 'tool_use') {
            // Extract tool use blocks from final message
            const toolUseBlocks = finalMsg.content.filter((b) => b.type === 'tool_use');
            const textBlocks = finalMsg.content.filter((b) => b.type === 'text');
            const textContent = textBlocks.map((b) => b.text).join('');

            // Save assistant message with tool calls
            await repo.insertMessage({
                chatId,
                role: 'assistant',
                content: textContent,
                toolCalls: toolUseBlocks,
                inputTokens: finalInputTokens,
                outputTokens: finalOutputTokens,
            });

            // Execute each tool and collect results
            const toolResultContents = [];
            for (const toolBlock of toolUseBlocks) {
                writeSSE(res, 'tool_executing', { toolName: toolBlock.name });

                const result = await executeTool(toolBlock.name, toolBlock.input, userId, timezone);
                const parsedResult = JSON.parse(result);

                writeSSE(res, 'tool_result', {
                    toolUseId: toolBlock.id,
                    toolName: toolBlock.name,
                    result: parsedResult,
                });

                // For proposal tools: emit structured action proposal for button rendering
                if (
                    toolBlock.name.startsWith('propose_') &&
                    !parsedResult.error &&
                    parsedResult.count !== 0
                ) {
                    writeSSE(res, 'action_proposal', {
                        proposalId: toolBlock.id,
                        actions: [parsedResult],
                    });
                }

                toolResultContents.push({
                    type: 'tool_result',
                    tool_use_id: toolBlock.id,
                    content: result,
                });
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
                content: [
                    ...(textContent ? [{ type: 'text', text: textContent }] : []),
                    ...toolUseBlocks,
                ],
            };
            const toolResultTurn = {
                role: 'user',
                content: toolResultContents,
            };
            const nextClaudeMessages = [...messages, assistantTurn, toolResultTurn];
            await runStreamingLoop(res, nextClaudeMessages, systemPrompt, userId, chatId, timezone);
        } else {
            // end_turn — save final message and close
            await repo.insertMessage({
                chatId,
                role: 'assistant',
                content: accumulatedText,
                inputTokens: finalInputTokens,
                outputTokens: finalOutputTokens,
            });
            await repo.touchChat(chatId);
            writeSSE(res, 'message_stop', {
                inputTokens: finalInputTokens,
                outputTokens: finalOutputTokens,
            });
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
 * Converts stored DB messages to Anthropic API message format.
 * Handles: plain user/assistant messages, assistant messages with tool calls,
 * and user messages containing tool_result blocks.
 */
function buildClaudeMessages(storedMessages) {
    const result = [];

    for (let i = 0; i < storedMessages.length; i++) {
        const msg = storedMessages[i];

        if (msg.role === 'user') {
            if (msg.toolResults && msg.toolResults.length > 0) {
                // Tool result turn — content is an array of tool_result blocks
                const content = [];
                if (msg.content) content.push({ type: 'text', text: msg.content });
                content.push(...msg.toolResults);
                result.push({ role: 'user', content });
            } else {
                result.push({ role: 'user', content: msg.content });
            }
        } else if (msg.role === 'system') {
            // Map system action-result notifications to user role so Claude understands context
            result.push({ role: 'user', content: msg.content });
        } else if (msg.role === 'assistant') {
            if (msg.toolCalls && msg.toolCalls.length > 0) {
                // Only include tool_use blocks if the very next stored message is
                // a user turn containing the matching tool_results. If the next
                // message is missing or is a plain user message, the tool_use was
                // never completed (e.g. a previous crash) — emit text-only to avoid
                // the "tool_use without tool_result" Anthropic API error.
                const next = storedMessages[i + 1];
                const nextHasResults = next?.role === 'user' && next?.toolResults?.length > 0;

                if (nextHasResults) {
                    const content = [];
                    if (msg.content) content.push({ type: 'text', text: msg.content });
                    content.push(...msg.toolCalls);
                    result.push({ role: 'assistant', content });
                } else {
                    // Orphaned tool_use — degrade to text-only so history stays valid
                    if (msg.content) {
                        result.push({ role: 'assistant', content: msg.content });
                    }
                    // Skip the orphaned row entirely if it has no text either
                }
            } else {
                result.push({ role: 'assistant', content: msg.content });
            }
        }
    }

    // Anthropic requires strictly alternating user/assistant turns.
    // Merge any consecutive same-role messages that may result from
    // orphaned tool_use rows or other data anomalies.
    const merged = [];
    for (const turn of result) {
        const prev = merged[merged.length - 1];
        if (prev && prev.role === turn.role) {
            // Merge into previous turn
            const prevContent = Array.isArray(prev.content)
                ? prev.content
                : [{ type: 'text', text: prev.content }];
            const thisContent = Array.isArray(turn.content)
                ? turn.content
                : [{ type: 'text', text: turn.content }];
            prev.content = [...prevContent, ...thisContent];
        } else {
            merged.push({ ...turn });
        }
    }
    return merged;
}
