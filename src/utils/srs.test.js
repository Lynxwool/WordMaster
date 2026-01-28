import { describe, it, expect } from 'vitest';
import { calculateReview, INITIAL_INTERVAL, INITIAL_EASE } from './srs';

describe('SRS Algorithm', () => {
    it('should initialize review parameters correctly for first time review', () => {
        const result = calculateReview(null, 2); // Good

        // First review Good -> interval 1 (or 6 depending on logic, let's check implementation)
        // Code says: if interval=0 and quality=2 -> newInterval = INITIAL_INTERVAL (1)
        expect(result.interval).toBe(INITIAL_INTERVAL);
        expect(result.ease).toBe(INITIAL_EASE);
        expect(result.reviews).toBe(1);
    });

    it('should handle "Again" (1) correctly by resetting interval', () => {
        const stats = { interval: 10, ease: 2.5, reviews: 5 };
        const result = calculateReview(stats, 1);

        expect(result.interval).toBe(INITIAL_INTERVAL);
        expect(result.ease).toBe(2.3); // 2.5 - 0.2
        expect(result.reviews).toBe(6);
    });

    it('should handle "Easy" (3) correctly by boosting interval and ease', () => {
        const stats = { interval: 10, ease: 2.5, reviews: 5 };
        const result = calculateReview(stats, 3);

        // newInterval = 10 * 2.5 * 1.5 = 37.5 -> round to 38
        expect(result.interval).toBe(38);
        expect(result.ease).toBe(2.65); // 2.5 + 0.15
    });

    it('should cap interval at 365 days', () => {
        const stats = { interval: 300, ease: 2.5, reviews: 10 };
        const result = calculateReview(stats, 3);

        // 300 * 2.5 * 1.5 > 365
        expect(result.interval).toBe(365);
    });

    it('should not let ease drop below 1.3', () => {
        const stats = { interval: 10, ease: 1.3, reviews: 5 };
        const result = calculateReview(stats, 1); // Again drops ease by 0.2

        expect(result.ease).toBe(1.3);
    });
});
