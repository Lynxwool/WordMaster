/**
 * Anki .apkg Parser
 * Extracts decks, notes, and media from Anki package files
 */

import initSqlJs from 'sql.js';

/**
 * Parse .apkg file (called from Electron main process)
 * @param {ArrayBuffer} apkgBuffer - .apkg file buffer
 * @returns {Promise<{deckName: string, words: Array, mediaFiles: Array}>}
 */
export async function parseApkg(apkgBuffer) {
    try {
        // Note: Actual unzipping happens in Electron main process
        // This function receives already extracted data
        return { deckName: '', words: [], mediaFiles: [] };
    } catch (error) {
        console.error('Error parsing .apkg:', error);
        throw new Error('檔案損壞或格式不正確');
    }
}

/**
 * Parse Anki collection.anki2 database
 * @param {Uint8Array} dbBuffer - SQLite database buffer
 * @returns {Promise<{decks: Array, notes: Array, cards: Array}>}
 */
export async function parseAnkiDB(dbBuffer) {
    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://sql.js.org/dist/${file}`
        });

        const db = new SQL.Database(dbBuffer);

        // Extract decks
        const decksResult = db.exec("SELECT decks FROM col");
        const decksJson = decksResult[0]?.values[0][0];
        const decks = decksJson ? JSON.parse(decksJson) : {};

        // Extract notes
        const notesResult = db.exec("SELECT id, mid, flds, tags FROM notes");
        const notes = notesResult[0]?.values.map(row => ({
            id: row[0],
            modelId: row[1],
            fields: row[2].split('\x1f'), // Anki uses \x1f as field separator
            tags: row[3].split(' ').filter(t => t)
        })) || [];

        // Extract cards (for scheduling data)
        const cardsResult = db.exec("SELECT id, nid, due, ivl, factor FROM cards");
        const cards = cardsResult[0]?.values.map(row => ({
            id: row[0],
            noteId: row[1],
            due: row[2],
            interval: row[3],
            ease: row[4] / 1000 // Anki stores ease as integer (2500 = 2.5)
        })) || [];

        db.close();

        return { decks, notes, cards };
    } catch (error) {
        console.error('Error parsing Anki database:', error);
        throw new Error('無法讀取 Anki 資料庫');
    }
}

/**
 * Convert Anki notes to WordMaster format
 * @param {Array} notes - Anki notes
 * @param {Array} cards - Anki cards (for SRS data)
 * @returns {Array} WordMaster words
 */
export function convertNotesToWords(notes, cards = []) {
    return notes.map(note => {
        const card = cards.find(c => c.noteId === note.id);

        // Field mapping: Front (0) → word, Back (1) → translation, Extra (2) → example
        const word = note.fields[0]?.trim() || '';
        const translation = note.fields[1]?.trim() || '';
        const extra = note.fields[2]?.trim() || '';

        // Extract phonetic from extra field (if in brackets)
        const phoneticMatch = extra.match(/\[(.*?)\]/);
        const phonetic = phoneticMatch ? phoneticMatch[1] : '';

        // Remove phonetic from example
        const example = extra.replace(/\[.*?\]/, '').trim();

        return {
            word,
            translation,
            example,
            phonetic,
            tags: note.tags.join(', '),
            // Preserve Anki SRS data if available
            interval: card?.interval || 0,
            ease: card?.ease || 2.5,
            reviews: 0,
            history: [],
            nextReview: card?.due ? Date.now() + (card.due * 24 * 60 * 60 * 1000) : Date.now()
        };
    }).filter(w => w.word && w.translation); // Only keep valid entries
}

/**
 * Extract audio filename from field content
 * @param {string} fieldContent - Anki field content
 * @returns {string|null} Audio filename
 */
export function extractAudioFilename(fieldContent) {
    // Anki audio format: [sound:filename.mp3]
    const match = fieldContent.match(/\[sound:(.*?)\]/);
    return match ? match[1] : null;
}
