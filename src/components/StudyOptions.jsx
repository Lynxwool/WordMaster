import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, ChevronLeft, CheckSquare, Square, SkipForward, AlertCircle, CheckCircle, Star, Plus, Keyboard, MousePointer } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { db } from '../utils/db';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudyOptions({ deck, onStart, onBack }) {
    const { t } = useLanguage();
    const [direction, setDirection] = useState('zh-to-en');
    const [prioritizeDue, setPrioritizeDue] = useState(true);
    const [questionType, setQuestionType] = useState('flashcard');

    // Rating Filters
    const [selectedRatings, setSelectedRatings] = useState(new Set());
    const [filteredCount, setFilteredCount] = useState(0);

    // Stats
    const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0, new: 0, total: 0, due: 0 });
    const [quote, setQuote] = useState('');

    const quotes = [
        "今天學習會讓你更強！",
        "加油，你一定行！",
        "每天進步一點點。",
        "堅持就是勝利。",
        "Learning makes you stronger."
    ];

    // Load settings & Calculate Stats
    useEffect(() => {
        const saved = localStorage.getItem(`study-settings-${deck.id}`);
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (settings.direction) setDirection(settings.direction);
                if (settings.prioritizeDue !== undefined) setPrioritizeDue(settings.prioritizeDue);
                if (settings.questionType) setQuestionType(settings.questionType);
            } catch (e) { console.warn(e); }
        }
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
        loadStats();
    }, [deck.id]);

    // Recalculate filtered count whenever selections change
    useEffect(() => {
        calculateFilteredCount();
    }, [selectedRatings, stats, prioritizeDue]);

    async function loadStats() {
        const words = await db.getWordsByDeck(deck.id);
        const s = { again: 0, hard: 0, good: 0, easy: 0, new: 0, total: words.length, due: 0 };
        const now = Date.now();

        words.forEach(w => {
            if (!w.nextReview || w.nextReview <= now) s.due++;

            if (!w.history || w.history.length === 0) {
                s.new++;
            } else {
                const last = w.history[w.history.length - 1];
                const score = last.score;
                // Map score to stats bucket
                if (score === 1 || score === 0) s.again++;
                else if (score === 2) s.hard++;
                else if (score === 3) s.good++;
                else if (score === 4) s.easy++;
                else s.new++;
            }
        });
        setStats(s);
    }

    async function calculateFilteredCount() {
        const words = await db.getWordsByDeck(deck.id);
        const now = Date.now();

        const count = words.filter(w => {
            const lastRating = w.history?.length > 0 ? w.history[w.history.length - 1].score : 0;

            if (selectedRatings.size > 0) {
                // If any rating is selected, we filter by rating ONLY (Ignore Due Date)
                if (lastRating === 0 && selectedRatings.has('new')) return true;
                if (selectedRatings.has(lastRating)) return true;
                return false;
            }

            // Default mode: Due or New (Standard Anki-like due)
            return !w.nextReview || w.nextReview <= now;
        }).length;

        setFilteredCount(count);
    }

    const toggleRating = (rating) => {
        const newSet = new Set(selectedRatings);
        if (newSet.has(rating)) newSet.delete(rating);
        else newSet.add(rating);
        setSelectedRatings(newSet);
    };

    const handleStart = () => {
        if (filteredCount === 0) {
            // Check if it's because of strict filters or just no cards
            if (selectedRatings.size > 0 && stats.total > 0) {
                if (confirm('目前沒有符合分級的卡片，是否改為標準到期模式？')) {
                    setSelectedRatings(new Set());
                    return;
                }
            } else {
                alert('沒有可複習的卡片');
            }
            return;
        }

        localStorage.setItem(`study-settings-${deck.id}`, JSON.stringify({ direction, prioritizeDue, questionType }));

        onStart({
            direction,
            ratings: Array.from(selectedRatings),
            mode: questionType,
            prioritizeDue
        });
    };

    const chartData = {
        labels: ['Again', 'Hard', 'Good', 'Easy', 'New'],
        datasets: [{
            data: [stats.again, stats.hard, stats.good, stats.easy, stats.new],
            backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#9CA3AF'],
            borderWidth: 0,
        }],
    };

    const chartOptions = {
        cutout: '70%',
        plugins: { legend: { display: false }, tooltip: { enabled: true } }
    };

    const mastery = stats.total > 0 ? Math.round(((stats.good + stats.easy) / stats.total) * 100) : 0;

    const questionTypes = [
        { id: 'flashcard', label: 'Flashcard', icon: <Square className="w-6 h-6" /> },
        { id: 'tapping', label: 'Tapping', icon: <MousePointer className="w-6 h-6" /> },
        { id: 'typing', label: 'Typing', icon: <Keyboard className="w-6 h-6" /> },
        { id: 'listening', label: 'Listening', icon: <Star className="w-6 h-6" /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-5xl"
            >
                <div className="mb-8 flex items-center justify-between">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 transition">
                        <ChevronLeft className="w-5 h-5" />
                        {t('back')}
                    </button>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{deck.name}</h2>
                        <p className="text-sm text-gray-500">{stats.total} words total</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Left: Stats & Chart */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative w-48 h-48 mb-6">
                            <Doughnut data={chartData} options={chartOptions} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{mastery}%</span>
                                <span className="text-xs text-gray-500">Mastery</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-600 dark:text-gray-400">
                            {/* Stats Legend */}
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Again {stats.again}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Hard {stats.hard}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Good {stats.good}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Easy {stats.easy}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> New {stats.new}</div>
                        </div>
                        <p className="mt-8 text-sm italic text-gray-400 text-center">"{quote}"</p>
                    </div>

                    {/* Right: Options */}
                    <div className="space-y-6">
                        {/* Rating Filters 2x2 Grid */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">分級篩選</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">優先每日複習</span>
                                    <button
                                        onClick={() => setPrioritizeDue(!prioritizeDue)}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${prioritizeDue ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${prioritizeDue ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <FilterOption
                                    label="Again"
                                    count={stats.again}
                                    checked={selectedRatings.has(1)}
                                    onChange={() => toggleRating(1)}
                                    color="border-red-500"
                                    bg="bg-red-50 dark:bg-red-900/20"
                                    text="text-red-700 dark:text-red-300"
                                />
                                <FilterOption
                                    label="Hard"
                                    count={stats.hard}
                                    checked={selectedRatings.has(2)}
                                    onChange={() => toggleRating(2)}
                                    color="border-orange-500"
                                    bg="bg-orange-50 dark:bg-orange-900/20"
                                    text="text-orange-700 dark:text-orange-300"
                                />
                                <FilterOption
                                    label="Good"
                                    count={stats.good}
                                    checked={selectedRatings.has(3)}
                                    onChange={() => toggleRating(3)}
                                    color="border-green-500"
                                    bg="bg-green-50 dark:bg-green-900/20"
                                    text="text-green-700 dark:text-green-300"
                                />
                                <FilterOption
                                    label="Easy"
                                    count={stats.easy}
                                    checked={selectedRatings.has(4)}
                                    onChange={() => toggleRating(4)}
                                    color="border-blue-500"
                                    bg="bg-blue-50 dark:bg-blue-900/20"
                                    text="text-blue-700 dark:text-blue-300"
                                />
                                <FilterOption
                                    label="New"
                                    count={stats.new}
                                    checked={selectedRatings.has('new')}
                                    onChange={() => toggleRating('new')}
                                    color="border-gray-400"
                                    bg="bg-gray-50 dark:bg-gray-800"
                                    text="text-gray-600 dark:text-gray-400"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                {selectedRatings.size === 0 ? "未選擇：預設模式 (到期優先)" : `已選擇 ${selectedRatings.size} 個分級 (忽略到期時間)`}
                            </p>
                        </div>

                        {/* Question Type Selection */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">題型選擇</h3>
                            <div className="grid grid-cols-4 gap-3">
                                {questionTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setQuestionType(type.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all transform ${questionType === type.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-105'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className={`mb-2 ${questionType === type.id ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {type.icon}
                                        </div>
                                        <span className={`text-xs font-bold ${questionType === type.id ? 'text-blue-700' : 'text-gray-500'}`}>
                                            {type.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Direction Toggle */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 uppercase tracking-wider">{t('learningDirection')}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setDirection('zh-to-en')}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${direction === 'zh-to-en'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                        }`}
                                >
                                    <span className={`text-sm ${direction === 'zh-to-en' ? 'font-bold text-blue-700' : 'text-gray-600'}`}>中文</span>
                                    <ArrowRight className={`w-5 h-5 ${direction === 'zh-to-en' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm ${direction === 'zh-to-en' ? 'font-bold text-blue-700' : 'text-gray-600'}`}>English</span>
                                </button>

                                <button
                                    onClick={() => setDirection('en-to-zh')}
                                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${direction === 'en-to-zh'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                        }`}
                                >
                                    <span className={`text-sm ${direction === 'en-to-zh' ? 'font-bold text-blue-700' : 'text-gray-600'}`}>English</span>
                                    <ArrowLeft className={`w-5 h-5 ${direction === 'en-to-zh' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm ${direction === 'en-to-zh' ? 'font-bold text-blue-700' : 'text-gray-600'}`}>中文</span>
                                </button>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStart}
                            disabled={filteredCount === 0 && selectedRatings.size === 0 && stats.due === 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${filteredCount > 0
                                ? 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-[1.02] active:scale-95'
                                : 'bg-gray-300 text-gray-500'
                                }`}
                        >
                            {selectedRatings.size === 0
                                ? filteredCount > 0 ? `開始標準複習 (${filteredCount})` : '沒有到期卡片'
                                : filteredCount > 0 ? `本次將複習 ${filteredCount} 張卡片 (已忽略到期時間)` : '沒有符合分級的卡片'
                            }
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function FilterOption({ label, count, checked, onChange, color, bg, text }) {
    return (
        <div
            onClick={onChange}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative ${checked ? `${color} ${bg}` : 'border-gray-100 hover:border-gray-200 bg-white dark:bg-gray-800'
                }`}
        >
            <div className="flex justify-between items-center mb-1">
                <span className={`font-bold ${checked ? text : 'text-gray-500'}`}>{label}</span>
                {checked && <div className={`w-3 h-3 rounded-full ${text.replace('text-', 'bg-')} current-color`} />}
            </div>
            <div className={`text-2xl font-bold ${checked ? text : 'text-gray-300'}`}>{count}</div>
        </div>
    );
}

