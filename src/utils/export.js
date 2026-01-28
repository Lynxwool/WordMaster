import { db } from './db';

/**
 * Export deck to Anki-compatible CSV format
 * Format: Front, Back, Extra, Tags
 * @param {number} deckId - Deck ID to export
 * @returns {Promise<string>} CSV content
 */
export async function exportDeckToAnkiCSV(deckId) {
    const words = await db.getWordsByDeck(deckId);

    if (words.length === 0) {
        throw new Error('此 Deck 無單字，無法匯出');
    }

    // Header
    let csv = 'Front,Back,Extra,Tags\n';

    // Data rows
    for (const word of words) {
        const front = escapeCSV(word.word);
        const back = escapeCSV(word.translation);

        // Combine phonetic and example into Extra
        // Format: phonetic (if any) + newline + example
        const extraParts = [];
        if (word.phonetic) extraParts.push(`/${word.phonetic}/`);
        if (word.example) extraParts.push(word.example);
        const extra = escapeCSV(extraParts.join('\n'));

        const tags = escapeCSV(word.tags || '');

        csv += `${front},${back},${extra},${tags}\n`;
    }

    return csv;
}

/**
 * Export deck to full JSON format with all data including SRS params
 * @param {number} deckId - Deck ID to export
 * @returns {Promise<string>} JSON content
 */
export async function exportDeckToJSON(deckId) {
    const deck = await db.getDeck(deckId);
    const words = await db.getWordsByDeck(deckId);

    if (words.length === 0) {
        throw new Error('此 Deck 無單字，無法匯出');
    }

    const exportData = {
        deck: {
            name: deck.name,
            created: deck.created,
            exportedAt: Date.now()
        },
        words: words.map(w => ({
            word: w.word,
            translation: w.translation,
            example: w.example,
            phonetic: w.phonetic,
            tags: w.tags,
            srs: {
                interval: w.interval,
                ease: w.ease,
                reviews: w.reviews,
                nextReview: w.nextReview,
                lastRating: w.lastRating,
                history: w.history
            }
        })),
        version: '1.0',
        format: 'WordMaster JSON Export'
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Escape CSV field (add quotes if contains comma, newline, or quote)
 * @param {string} field - Field value
 * @returns {string} Escaped field
 */
function escapeCSV(field) {
    if (!field) return '';

    const str = field.toString();

    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/**
 * Trigger browser download for exported file
 * @param {string} content - File content
 * @param {string} filename - Suggested filename
 * @param {string} mimeType - MIME type
 */
export async function downloadFile(content, filename, mimeType) {
    // Check if Electron API is available
    if (window.electron && window.electron.saveFile) {
        try {
            const result = await window.electron.saveFile(content, filename);
            if (result) {
                console.log('File saved via Electron:', result);
                return true;
            }
        } catch (e) {
            console.warn('Electron save failed, falling back to browser download:', e);
        }
    }

    // Fallback to browser download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
}
