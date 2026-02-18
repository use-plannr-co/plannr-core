import express from 'express';
import { ENV } from './config/env.js';

const app = express();
const PORT = ENV.PORT;

/**
 * ================================
 *  Plannr Backend API Endpoints
 * ================================
 */

/**
 * Health
 * --------------------------------
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({ success: true });
});

/**
 * Schedules & Blocks
 * --------------------------------
 * POST   /schedules                         → create new schedule
 */
app.post('/api/schedules', async (req, res) => {
    try {
        const {
            id,
            ownerId,
            title,
            periodStart,
            periodEnd,
            isActive,
            version,
            deletedAt,
            createdAt,
            updatedAt,
        } = req.body;

        if (!title || !periodStart || !periodEnd || !isActive) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
    } catch {}
});

/**
 * GET    /schedules                         → get list of schedules (optionally ?since, ?limit, ?cursor)
 */

/**
 * GET    /schedules/:id                     → get full schedule by id
 */

/**
 * PUT    /schedules/:id                     → update schedule (metadata or bulk replace blocks)
 */

/**
 * DELETE /schedules/:id                     → soft delete schedule
 */

/**
 * POST   /schedules/:id/blocks              → add one or more blocks to a schedule
 */

/**
 * PUT    /schedules/:id/blocks/:blockId     → update a specific block
 */

/**
 * DELETE /schedules/:id/blocks/:blockId     → soft delete a specific block
 */

/**
 * POST   /schedules/:id/ops                 → apply diff ops (add/update/delete multiple blocks)
 */

/**
 * Sync (offline-first support)
 * --------------------------------
 * POST   /sync                     → push batched local changes to server
 * GET    /sync?since=timestamp     → pull changes since timestamp
 */

/**
 * AI Chat (Planzo)
 * --------------------------------
 * POST   /ai/sessions              → start new AI chat session
 * POST   /ai/sessions/:sid/messages
 *                                   → send user message, receive AI reply
 * GET    /ai/sessions/:sid/messages
 *                                   → get chat history (optionally ?since)
 *
 * POST   /ai/actions/reschedule    → request AI-generated reschedule proposal
 * POST   /ai/actions/insights      → request AI-generated insights/analytics
 */

/**
 * Co-Plan (Collaboration)
 * --------------------------------
 * GET    /profiles/:userId         → get minimal public profile for a user
 * GET    /schedules?owner=userId&active=true
 *                                   → get collaborator’s active schedules
 *
 * POST   /shares                   → share a schedule with another user
 * GET    /shares                   → list current shares (optionally ?since)
 */

/**
 * Analytics
 * --------------------------------
 * GET    /analytics/summary        → get performance summary (e.g. ?range=last_7d&tz=UTC)
 * POST   /analytics/recompute      → (optional/admin) recompute aggregates for a range
 */

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
