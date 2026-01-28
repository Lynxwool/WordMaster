import { openDB } from 'idb';

const DB_NAME = 'wordmaster-db';
const DB_VERSION = 1;

export async function initDB() {
    try {
        const database = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('decks')) {
                    const decksStore = db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
                    decksStore.createIndex('name', 'name', { unique: false });
                }
                if (!db.objectStoreNames.contains('words')) {
                    const wordsStore = db.createObjectStore('words', { keyPath: 'id', autoIncrement: true });
                    wordsStore.createIndex('deckId', 'deckId', { unique: false });
                    wordsStore.createIndex('nextReview', 'nextReview', { unique: false });
                }
            },
        });
        console.log('✅ IndexedDB opened successfully');
        return database;
    } catch (err) {
        console.error('❌ IndexedDB open failed:', err);

        // User-friendly error message
        const errorMsg = `資料庫開啟失敗: ${err.message}\n\n請嘗試以下步驟：\n1. 重啟應用程式\n2. 刪除資料夾: ~/Library/Application Support/wordmaster\n3. 重新啟動電腦`;

        alert(errorMsg);

        // Return null to allow graceful degradation
        return null;
    }
}

export const db = {
    async getDecks() {
        const db = await initDB();
        if (!db) {
            console.warn('DB is null, returning empty array');
            return [];
        }

        const decks = await db.getAll('decks');
        const results = [];

        for (const deck of decks) {
            const words = await db.getAllFromIndex('words', 'deckId', deck.id);
            const total = words.length;
            const due = words.filter(w => !w.nextReview || w.nextReview <= Date.now()).length;
            const newCount = words.filter(w => !w.reviews || w.reviews === 0).length;
            results.push({ ...deck, total, due, new: newCount });
        }

        return results;
    },

    async createDeck(name) {
        const db = await initDB();
        return db.add('decks', { name, created: Date.now() });
    },

    async importWords(deckId, wordsData) {
        const db = await initDB();
        const tx = db.transaction('words', 'readwrite');
        const store = tx.objectStore('words');

        for (const word of wordsData) {
            await store.add({
                deckId,
                word: word.word,
                translation: word.translation,
                example: word.example || '',
                phonetic: word.phonetic || '',
                tags: word.tags || '',
                interval: 0,
                ease: 2.5,
                reviews: 0,
                nextReview: 0,
                history: [],
                lastRating: null
            });
        }

        await tx.done;
    },

    async getWordsByDeck(deckId) {
        const db = await initDB();
        return db.getAllFromIndex('words', 'deckId', deckId);
    },

    async getDueWords(deckId, limit = 20) {
        const db = await initDB();
        const allWords = await db.getAllFromIndex('words', 'deckId', deckId);
        const now = Date.now();
        const dueWords = allWords.filter(w => !w.nextReview || w.nextReview <= now);
        return dueWords.slice(0, limit);
    },

    async updateWord(id, srsData) {
        const db = await initDB();
        const word = await db.get('words', id);
        if (!word) throw new Error('Word not found');

        const updated = { ...word, ...srsData };
        await db.put('words', updated);
        return updated;
    },

    // Backward compatibility alias
    async updateWordDNS(id, srsData) {
        return this.updateWord(id, srsData);
    },

    async getDeck(id) {
        const db = await initDB();
        return db.get('decks', id);
    },

    async deleteDeck(id) {
        const db = await initDB();
        const tx = db.transaction(['decks', 'words'], 'readwrite');
        await tx.objectStore('decks').delete(id);
        const index = tx.objectStore('words').index('deckId');
        let cursor = await index.openCursor(IDBKeyRange.only(id));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
    },

    async addWord(deckId, wordData) {
        const db = await initDB();
        return db.add('words', {
            deckId,
            word: wordData.word,
            translation: wordData.translation,
            example: wordData.example || '',
            phonetic: wordData.phonetic || '',
            tags: wordData.tags || '',
            reviews: 0,
            learningStep: 0,
            interval: 0,
            easeFactor: 2.5,
            nextReview: 0,
            created: Date.now()
        });
    },

    async deleteWord(id) {
        const db = await initDB();
        return db.delete('words', id);
    },

    async mergeDecks(sourceIds, targetId) {
        const db = await initDB();

        // 1. Get target words to check for duplicates
        // Note: We use a separate transaction for reading mostly to be safe, 
        // but we can do it in the loop if careful. 
        // For simplicity, read all target words first.
        const targetWords = await this.getWordsByDeck(targetId);
        const existingWords = new Set(targetWords.map(w => w.word.toLowerCase().trim()));

        let movedCount = 0;
        let skippedCount = 0;

        for (const sourceId of sourceIds) {
            if (sourceId === targetId) continue;

            const sourceWords = await this.getWordsByDeck(sourceId);
            const tx = db.transaction(['decks', 'words'], 'readwrite');
            const wordStore = tx.objectStore('words');
            const deckStore = tx.objectStore('decks');

            for (const word of sourceWords) {
                const normalized = word.word.toLowerCase().trim();
                if (existingWords.has(normalized)) {
                    // Duplicate: delete
                    await wordStore.delete(word.id);
                    skippedCount++;
                } else {
                    // Unique: move to target
                    word.deckId = targetId;
                    await wordStore.put(word);
                    existingWords.add(normalized);
                    movedCount++;
                }
            }

            // Delete the source deck
            await deckStore.delete(sourceId);
            await tx.done;
        }

        return { moved: movedCount, skipped: skippedCount };
    },

    async getTodayReviewedCount() {
        const db = await initDB();
        if (!db) return 0;

        const words = await db.getAll('words');
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const nextDay = startOfDay + 86400000;

        let count = 0;
        const reviewedWordIds = new Set();

        for (const w of words) {
            if (w.history && w.history.length > 0) {
                const lastReview = w.history[w.history.length - 1];
                if (lastReview.timestamp >= startOfDay && lastReview.timestamp < nextDay) {
                    reviewedWordIds.add(w.id);
                }
            }
        }
        return reviewedWordIds.size;
    }
};
