import Papa from 'papaparse';

/**
 * Enhanced CSV parser with Anki format auto-detection
 * Supports both standard format (word/translation/example/phonetic) 
 * and Anki format (Front/Back/Extra/Tags)
 */
export function parseCSV(csvContent) {
    return new Promise((resolve, reject) => {
        if (csvContent.length > 5 * 1024 * 1024) {
            reject(new Error('檔案過大（超過 5MB），請分批匯入'));
            return;
        }

        Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn('CSV Parse Warnings:', results.errors);
                    const criticalErrors = results.errors.filter(e => e.type === 'Quotes' || e.type === 'FieldMismatch');
                    if (criticalErrors.length > 0) {
                        reject(new Error('CSV 格式錯誤，請檢查是否有未關閉的引號或欄位數量不一致'));
                        return;
                    }
                }

                const fields = results.meta.fields || [];
                const lowerFields = fields.map(f => f.toLowerCase());

                // Detect Anki format (Front/Back columns)
                const isAnkiFormat = lowerFields.includes('front') && lowerFields.includes('back');

                let formatMessage = '';
                if (isAnkiFormat) {
                    formatMessage = 'Detected Anki format (Front/Back/Extra/Tags)';
                } else {
                    // Validate standard format
                    if (!lowerFields.includes('word')) {
                        reject(new Error('CSV 缺少必要欄位 "word"（或 Anki 格式的 "Front"），請參考格式說明'));
                        return;
                    }
                    if (!lowerFields.includes('translation')) {
                        reject(new Error('CSV 缺少必要欄位 "translation"（或 Anki 格式的 "Back"），請參考格式說明'));
                        return;
                    }
                }

                let skippedCount = 0;
                const validWords = results.data.filter(row => {
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.toLowerCase()] = row[key];
                    });

                    let word, translation;

                    if (isAnkiFormat) {
                        word = normalizedRow.front?.trim();
                        translation = normalizedRow.back?.trim();
                    } else {
                        word = normalizedRow.word?.trim();
                        translation = normalizedRow.translation?.trim();
                    }

                    if (!word || !translation) {
                        skippedCount++;
                        return false;
                    }

                    return true;
                }).map(row => {
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.toLowerCase()] = row[key];
                    });

                    let word, translation, example, phonetic, tags;

                    if (isAnkiFormat) {
                        // Anki format mapping
                        word = normalizedRow.front?.trim() || '';
                        translation = normalizedRow.back?.trim() || '';

                        // Extra field maps to example + phonetic (merged)
                        const extra = normalizedRow.extra?.trim() || '';

                        // Try to extract phonetic check
                        const phoneticMatch = extra.match(/^[\/\[](.+?)[\/\]]/);
                        if (phoneticMatch) {
                            phonetic = phoneticMatch[1];
                            example = extra.replace(phoneticMatch[0], '').trim();
                        } else {
                            const parts = extra.split('\n');
                            if (parts.length > 1 && parts[0].length < 30 && (parts[0].includes('/') || parts[0].includes('['))) {
                                phonetic = parts[0].replace(/[\/\[\]]/g, '').trim();
                                example = parts.slice(1).join(' ').trim();
                            } else {
                                example = extra;
                                phonetic = '';
                            }
                        }

                        tags = normalizedRow.tags?.trim() || '';
                    } else {
                        // Standard format
                        word = normalizedRow.word?.trim() || '';
                        translation = normalizedRow.translation?.trim() || '';
                        example = normalizedRow.example?.trim() || '';
                        phonetic = normalizedRow.phonetic?.trim() || '';
                        tags = normalizedRow.tags?.trim() || '';
                    }

                    return { word, translation, example, phonetic, tags };
                });

                if (validWords.length === 0) {
                    reject(new Error('未匯入任何單字，請確認檔案內容是否包含有效的 word 和 translation'));
                    return;
                }

                if (skippedCount > 0) {
                    console.warn(`已略過 ${skippedCount} 筆無效單字`);
                }

                resolve({
                    words: validWords,
                    skippedCount,
                    formatDetected: isAnkiFormat ? 'anki' : 'standard',
                    formatMessage
                });
            },
            error: (error) => {
                reject(new Error('CSV 解析失敗: ' + error.message));
            }
        });
    });
}
