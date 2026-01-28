import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { parseCSV } from '../utils/csv';
import { getTodayStats, getCurrentStreak } from '../utils/stats';
import CsvHelpModal from './CsvHelpModal';
import OnboardingModal from './OnboardingModal';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import { CheckSquare, Square, Merge, Trash2 } from 'lucide-react';

export default function Dashboard({ onSelectDeck, onEditDeck }) {
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [todayStats, setTodayStats] = useState({ cardsCompleted: 0, timeSpent: 0, accuracy: 0 });
    const [streak, setStreak] = useState(0);
    const [toast, setToast] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Deck Selection State
    const [selectedDecks, setSelectedDecks] = useState(new Set());
    const [showMergeModal, setShowMergeModal] = useState(false);

    useEffect(() => {
        loadDecks();
        loadStats();

        // Check onboarding
        const hasSeenOnboarding = localStorage.getItem('onboarding_seen');
        if (!hasSeenOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    // Toast Timer
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    async function loadStats() {
        const stats = getTodayStats();
        const count = await db.getTodayReviewedCount();
        const s = getCurrentStreak();
        setTodayStats({ ...stats, cardsCompleted: count });
        setStreak(s);
    }

    async function loadDecks() {
        setLoading(true);
        try {
            const data = await db.getDecks();
            setDecks(data);
            setSelectedDecks(new Set()); // Reset selection
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Toggle Selection
    const toggleSelectDeck = (id) => {
        const newSet = new Set(selectedDecks);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedDecks(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedDecks.size === decks.length) {
            setSelectedDecks(new Set());
        } else {
            setSelectedDecks(new Set(decks.map(d => d.id)));
        }
    };

    // Actions
    const handleDeleteSelected = async () => {
        if (!confirm(`確定要刪除選取的 ${selectedDecks.size} 個牌組嗎？\n此動作無法復原。`)) return;

        for (const id of selectedDecks) {
            await db.deleteDeck(id);
        }
        await loadDecks();
    };

    const handleMergeSelected = async (targetId) => {
        if (!targetId) return;
        if (!confirm('確定合併？其他選取的牌組將被刪除。')) return;

        try {
            const sourceIds = Array.from(selectedDecks);
            const result = await db.mergeDecks(sourceIds, targetId);
            alert(`合併成功！\n已移動 ${result.moved} 個單字\n略過 ${result.skipped} 個重複單字`);
            setShowMergeModal(false);
            await loadDecks();
        } catch (e) {
            alert('合併失敗: ' + e.message);
        }
    };

    async function handleAddDeck() {
        if (!window.electronAPI) {
            setToast({ type: 'error', message: 'Electron 環境未載入，請重啟應用程式' });
            return;
        }

        try {
            const result = await window.electronAPI.selectFile();
            if (!result) return; // User cancelled

            setIsLoading(true);

            if (result.type === 'apkg') {
                await handleApkgImport(result);
            } else if (result.type === 'csv') {
                await handleCsvImport(result);
            } else {
                // Flashback or unknown type, try to infer from path if possible, or fail
                const pathStr = result.path || (typeof result === 'string' ? result : '');
                if (pathStr.toLowerCase().endsWith('.apkg')) {
                    await handleApkgImport({ path: pathStr, type: 'apkg' });
                } else if (pathStr.toLowerCase().endsWith('.csv')) {
                    // Can't handle CSV without content from backend in this path
                    throw new Error('CSV 讀取失敗，請重試');
                } else {
                    throw new Error('不支援的檔案類型');
                }
            }
        } catch (e) {
            console.error(e);
            setToast({ type: 'error', message: e.message || '匯入失敗' });
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCsvImport(result) {
        try {
            const content = result.content;
            if (!content) throw new Error('無法讀取 CSV 內容');

            const parseResult = await parseCSV(content);
            const words = parseResult.words;
            const fileName = (result.path || 'import').split(/[\\/]/).pop().replace('.csv', '');

            if (words.length === 0) throw new Error('無有效單字');

            const deckId = await db.createDeck(fileName);
            await db.importWords(deckId, words);
            await loadDecks();
            setToast({ type: 'success', message: `成功匯入 ${words.length} 個單字！` });
        } catch (e) {
            throw e; // Bubble up to handleAddDeck
        }
    }

    async function handleApkgImport(result) {
        try {
            const extracted = await window.electronAPI.extractApkg(result.path);

            if (!extracted.dbBuffer) throw new Error('無法讀取 Anki 資料庫');

            const { parseAnkiDB, convertNotesToWords } = await import('../utils/apkg.js');
            const dbData = await parseAnkiDB(new Uint8Array(extracted.dbBuffer));

            const deckNames = Object.values(dbData.decks);
            const deckName = deckNames[0]?.name || (result.path || 'import').split(/[\\/]/).pop().replace('.apkg', '');

            const words = convertNotesToWords(dbData.notes, dbData.cards);

            if (words.length === 0) throw new Error('未找到有效卡片');

            const deckId = await db.createDeck(deckName);
            await db.importWords(deckId, words);

            if (extracted.mediaFiles?.length > 0) {
                // Async copy media in background to avoid blocking too long?
                // Or just do it. For safety let's do it sequentially or batched.
                // Promise.all might overwhelm IPC.
                for (const media of extracted.mediaFiles) {
                    try {
                        await window.electronAPI.copyMedia(media.path, deckId, media.name);
                    } catch (e) { /* ignore */ }
                }
            }

            await loadDecks();
            setToast({ type: 'success', message: `成功匯入 ${words.length} 個單字！` });
        } catch (error) {
            console.error('APKG import error:', error);
            if (error.message.includes('ENOTDIR')) {
                throw new Error('暫存目錄錯誤，請重啟電腦後再試');
            }
            throw new Error('檔案損壞或非 Anki 格式: ' + error.message);
        }
    }

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.message}
                </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-400">匯入中...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Decks</h1>
                    <p className="text-gray-600 dark:text-gray-400">Ready to learn?</p>
                </div>
                <div className="flex gap-3 items-center">
                    <button onClick={() => setShowHelpModal(true)} className="p-3 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 transition">
                        <QuestionMarkCircleIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => setShowOnboarding(true)} className="p-3 text-sm font-bold text-gray-500 hover:text-gray-700">教學</button>
                    <button
                        onClick={handleAddDeck}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Import Deck
                    </button>
                </div>
            </header>

            {/* Top Stats */}
            <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-green-500 shadow-sm">
                    <div className="text-sm text-gray-500">今日完成</div>
                    <div className="text-2xl font-bold">{todayStats.cardsCompleted}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-blue-500 shadow-sm">
                    <div className="text-sm text-gray-500">學習時間</div>
                    <div className="text-2xl font-bold">{Math.floor(todayStats.timeSpent / 60)}m {todayStats.timeSpent % 60}s</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-purple-500 shadow-sm">
                    <div className="text-sm text-gray-500">準確率</div>
                    <div className="text-2xl font-bold">{todayStats.accuracy}%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-l-4 border-orange-500 shadow-sm">
                    <div className="text-sm text-gray-500">連勝天數</div>
                    <div className="text-2xl font-bold">{streak} <span className="text-sm">🔥</span></div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4 min-h-[40px]">
                <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition"
                >
                    {selectedDecks.size === decks.length && decks.length > 0 ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5" />}
                    <span>全選 ({selectedDecks.size})</span>
                </button>

                {selectedDecks.size > 0 && (
                    <div className="flex gap-2">
                        {selectedDecks.size >= 2 && (
                            <button
                                onClick={() => setShowMergeModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg font-bold hover:bg-blue-200 transition"
                            >
                                <Merge className="w-4 h-4" /> 合併 Deck
                            </button>
                        )}
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg font-bold hover:bg-red-200 transition"
                        >
                            <Trash2 className="w-4 h-4" /> 刪除
                        </button>
                    </div>
                )}
            </div>

            {/* Deck List */}
            {loading ? (
                <div className="text-center py-20">Loading...</div>
            ) : decks.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-xl">
                    <p className="text-gray-500">尚無單字庫</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map(deck => (
                        <div
                            key={deck.id}
                            className={`relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm transition-all duration-150 hover:scale-[1.02] border-2 cursor-pointer group ${selectedDecks.has(deck.id) ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-green-400'
                                }`}
                            onClick={() => {
                                onSelectDeck(deck);
                            }}
                        >
                            {/* Checkbox (Absolute) */}
                            <div
                                className="absolute top-4 left-4 z-10 p-2 -ml-2 -mt-2"
                                onClick={(e) => { e.stopPropagation(); toggleSelectDeck(deck.id); }}
                            >
                                {selectedDecks.has(deck.id) ? <CheckSquare className="w-6 h-6 text-blue-500" /> : <Square className="w-6 h-6 text-gray-300 group-hover:text-gray-400" />}
                            </div>

                            <div className="pl-8 mb-4">
                                <h3 className="text-xl font-bold truncate pr-16">{deck.name}</h3>
                                {(deck.due > 0 || deck.new > 0) && (
                                    <div className="flex gap-2 mt-1">
                                        {deck.due > 0 && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">{deck.due} due</span>}
                                        {deck.new > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{deck.new} new</span>}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4 pl-8">
                                <div className="flex justify-between">
                                    <span>Total</span>
                                    <span>{deck.total}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, ((deck.total - deck.due) / deck.total) * 100 || 0)}%` }}></div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700 pl-8">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditDeck(deck); }}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1 rounded transition"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Merge Modal */}
            {showMergeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowMergeModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">合併牌組</h3>
                        <p className="text-sm text-gray-500 mb-4">請選擇合併的目標牌組（其他選取牌組的單字將移動至此，原牌組將被刪除）：</p>

                        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                            {decks.filter(d => selectedDecks.has(d.id)).map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => handleMergeSelected(d.id)}
                                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition flex justify-between items-center group"
                                >
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{d.name}</span>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                </button>
                            ))}
                        </div>

                        <button onClick={() => setShowMergeModal(false)} className="w-full py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">取消</button>
                    </div>
                </div>
            )}

            <CsvHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
            <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
        </div>
    );
}

// Helper for Merge Modal
function ArrowRight(props) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}
