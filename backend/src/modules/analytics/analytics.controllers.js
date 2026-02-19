import * as repo from './analytics.repo.js';

export async function getAnalytics(req, res, next) {
    try {
        const { userId } = req.auth;
        const [analytics, mood] = await Promise.all([
            repo.getOrComputeAnalytics(userId),
            repo.getMoodCheckins(userId),
        ]);
        res.json({ success: true, data: { analytics, mood } });
    } catch (err) {
        next(err);
    }
}

export async function submitMoodCheckin(req, res, next) {
    try {
        const { userId } = req.auth;
        const { date, rating } = req.validated?.body || req.body;
        await repo.submitMoodCheckin(userId, date, rating);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}
