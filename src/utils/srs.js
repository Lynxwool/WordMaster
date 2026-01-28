/**
 * WordMaster SRS Algorithm
 * Enhanced Anki-style system with Skip mechanism
 */

export const INITIAL_INTERVAL = 1; // 1 day
export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL = 365;

/**
 * Updates a card's SRS status based on the rating.
 * Returns the updated card object (does not save to DB).
 * @param {Object} card - The word object
 * @param {number|string} rating - 0/'skip', 2/'hard', 3/'good', 4/'easy'
 * @returns {Object} Updated card object with new interval, ease, etc.
 */
export function updateCard(card, rating) {
    // Normalize rating to string for internal use
    let r = rating;
    if (typeof rating === 'number') {
        if (rating === 0) r = 'skip';
        else if (rating === 2) r = 'hard';
        else if (rating === 3) r = 'good';
        else if (rating === 4) r = 'easy';
    }

    // Default stats if missing
    const currentStats = {
        interval: card.interval || 0,
        ease: card.ease || 2.5,
        reviews: card.reviews || 0,
        history: card.history || []
    };

    const result = calculateReview(currentStats, r);

    return {
        ...card,
        interval: result.interval,
        ease: result.ease,
        reviews: result.reviews,
        history: result.history,
        nextReview: result.nextReview,
        lastRating: r
    };
}

/**
 * Calculates the next review parameters
 * @param {Object} currentStats - Current SRS stats { interval, ease, reviews, history }
 * @param {string} rating - 'skip' (0), 'hard' (2), 'good' (3), 'easy' (4)
 */
export function calculateReview(currentStats, rating) {
    let { interval, ease, reviews, history } = currentStats || {
        interval: 0,
        ease: INITIAL_EASE,
        reviews: 0,
        history: []
    };

    // Defaults
    if (!interval) interval = 0;
    if (!ease) ease = INITIAL_EASE;
    if (!reviews) reviews = 0;
    if (!history) history = [];

    let newInterval;
    let newEase = ease;
    let score = 0; // 0=Skip/Again, 2=Hard, 3=Good, 4=Easy

    switch (rating) {
        case 'skip': // Replaces 'again'
            score = 0;
            // Skip/Fail: Reset interval to a short duration (e.g., 1 hour = 0.04 days)
            // But usually for "Due" checking we use timestamps. 
            // Let's set interval to 0 to mean "Review ASAP" or use a fraction.
            newInterval = 0.04; // ~1 hour
            newEase = Math.max(MIN_EASE, ease - 0.2);
            break;

        case 'hard':
            score = 2;
            if (interval < 1) {
                newInterval = 1;
            } else {
                newInterval = Math.max(1, Math.floor(interval * 1.2));
            }
            newEase = Math.max(MIN_EASE, ease - 0.15);
            break;

        case 'good':
            score = 3;
            if (interval < 1) {
                newInterval = 1;
            } else if (interval === 1) {
                newInterval = 3; // Anki default is often 1->3->...
            } else {
                newInterval = Math.floor(interval * Math.max(1.3, ease));
            }
            break;

        case 'easy':
            score = 4;
            if (interval < 1) {
                newInterval = 4;
            } else {
                newInterval = Math.floor(interval * 2.0);
            }
            newEase = Math.min(5.0, ease + 0.1);
            break;

        default:
            newInterval = interval;
    }

    // Cap interval
    if (newInterval > MAX_INTERVAL) newInterval = MAX_INTERVAL;

    // Ensure At least some progress for Good/Easy if logic failed to grow
    if ((rating === 'good' || rating === 'easy') && newInterval <= interval && interval >= 1) {
        newInterval = interval + 1;
    }

    // New History
    const now = Date.now();
    const newHistory = [...history, { score, timestamp: now }];

    // Next Review Time
    // newInterval is in days.
    const nextReview = now + (newInterval * 24 * 60 * 60 * 1000);

    return {
        interval: newInterval,
        ease: newEase,
        reviews: reviews + 1,
        nextReview: nextReview,
        history: newHistory,
        lastRating: rating // persist for filtering 'hard'/'good' etc.
    };
}

/**
 * Filter words based on selection
 */
export function filterWords(words, filters) {
    if (!filters) return words;
    // filters: { skip: bool, hard: bool, good: bool, easy: bool, new: bool }

    // If no filters selected, maybe return all? Or none? 
    // Usually "nothing selected" implies "nothing to show".
    // But for safety, if all false, maybe user hasn't touched UI, default to Due?
    // User requested: "Review Range" -> checkbox.
    // Logic: matching ANY selected category.

    return words.filter(w => {
        // New Card?
        const isNew = !w.history || w.history.length === 0;
        if (isNew) return filters.new;

        // Existing Card - check last score
        const last = w.history[w.history.length - 1];
        const lastScore = last ? last.score : null;

        if (lastScore === 0) return filters.skip; // Skip/Again
        if (lastScore === 2) return filters.hard;
        if (lastScore === 3) return filters.good;
        if (lastScore === 4) return filters.easy;

        return false;
    });
}
