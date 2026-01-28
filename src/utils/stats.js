/**
 * Statistics utility for tracking study progress and generating positive feedback
 */

/**
 * Calculate accuracy percentage from session stats
 * @param {Object} stats - {again, hard, good, easy}
 * @returns {number} Accuracy percentage (0-100)
 */
export function calculateAccuracy(stats) {
    const total = stats.again + stats.hard + stats.good + stats.easy + (stats.skip || 0);
    if (total === 0) return 0;

    // Accuracy = (Good + Easy) / Total
    // Again/Hard are considered "incorrect" or "learning", so they lower the score.
    const positive = stats.good + stats.easy;
    return Math.round((positive / total) * 100);
}

/**
 * Generate motivational feedback text based on accuracy
 * @param {number} accuracy - Accuracy percentage
 * @returns {string} Motivational message
 */
export function getMotivationalMessage(accuracy) {
    if (accuracy >= 80) {
        return '太棒了！你今天進步很多！';
    } else if (accuracy >= 60) {
        return '做得好！保持這個節奏！';
    } else {
        return '堅持就是勝利，继续加油！'; // Simplified to match prompt specifically
    }
}

/**
 * Update daily streak counter
 * @returns {number} Current streak days
 */
export function updateDailyStreak() {
    const today = new Date().toISOString().split('T')[0];
    const streakData = JSON.parse(localStorage.getItem('study-streak') || '{"lastDate": null, "count": 0}');

    if (streakData.lastDate === today) {
        // Already studied today
        return streakData.count;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streakData.lastDate === yesterday) {
        // Consecutive day
        streakData.count += 1;
    } else if (streakData.lastDate !== today) {
        // Streak broken, restart
        streakData.count = 1;
    }

    streakData.lastDate = today;
    localStorage.setItem('study-streak', JSON.stringify(streakData));
    return streakData.count;
}

/**
 * Get current streak count without updating
 * @returns {number} Current streak days
 */
export function getCurrentStreak() {
    const streakData = JSON.parse(localStorage.getItem('study-streak') || '{"lastDate": null, "count": 0}');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if streak is still active
    if (streakData.lastDate === today || streakData.lastDate === yesterday) {
        return streakData.count;
    }

    return 0; // Streak broken
}

/**
 * Save today's study session stats
 * @param {Object} sessionData - {cardsCompleted, timeSpent, accuracy}
 */
export function saveTodayStats(sessionData) {
    const today = new Date().toISOString().split('T')[0];
    const key = `daily-stats-${today}`;

    const existing = JSON.parse(localStorage.getItem(key) || '{"cardsCompleted": 0, "timeSpent": 0, "totalAccuracy": 0, "sessions": 0}');

    existing.cardsCompleted += sessionData.cardsCompleted;
    existing.timeSpent += sessionData.timeSpent;
    existing.totalAccuracy = ((existing.totalAccuracy * existing.sessions) + sessionData.accuracy) / (existing.sessions + 1);
    existing.sessions += 1;

    localStorage.setItem(key, JSON.stringify(existing));
}

/**
 * Get today's aggregated stats
 * @returns {Object} {cardsCompleted, timeSpent, accuracy}
 */
export function getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const key = `daily-stats-${today}`;
    const stats = JSON.parse(localStorage.getItem(key) || '{"cardsCompleted": 0, "timeSpent": 0, "totalAccuracy": 0}');

    return {
        cardsCompleted: stats.cardsCompleted,
        timeSpent: stats.timeSpent,
        accuracy: Math.round(stats.totalAccuracy)
    };
}

/**
 * Get last export date
 * @returns {string|null} Last export date or null
 */
export function getLastExportDate() {
    return localStorage.getItem('last-export-date');
}

/**
 * Update last export date
 */
export function updateLastExportDate() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('last-export-date', today);
}

/**
 * Check if backup reminder should be shown (7+ days since last export)
 * @returns {boolean}
 */
export function shouldShowBackupReminder() {
    const lastExport = getLastExportDate();
    if (!lastExport) return true;

    const lastExportDate = new Date(lastExport);
    const daysSince = Math.floor((Date.now() - lastExportDate.getTime()) / 86400000);

    return daysSince >= 7;
}
