import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import { updateCard, filterWords } from '../utils/srs';
import FlashCard from './FlashCard';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import FillInBlankQuestion from './FillInBlankQuestion';
import TappingQuestion from './TappingQuestion';
import TypingQuestion from './TypingQuestion';
import ListeningQuestion from './ListeningQuestion';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { CheckCircle, AlertCircle, X, SkipForward, Star, Check } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useLanguage } from '../hooks/useLanguage';
import { getMotivationalMessage, updateDailyStreak, saveTodayStats } from '../utils/stats';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ReviewSession({ deck, studySettings, onExit, onBackToOptions }) {
    const { t } = useLanguage();
    const [words, setWords] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionStats, setSessionStats] = useState({ skip: 0, hard: 0, good: 0, easy: 0 });
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(true);
    const [startTime] = useState(Date.now());
    const [error, setError] = useState(null);
    const { width, height } = useWindowSize();

    useEffect(() => {
        loadWords();
    }, [deck, studySettings]);

    // Window Size Hook
    function useWindowSize() {
        if (typeof window === 'undefined') return { width: 0, height: 0 };
        const [windowSize, setWindowSize] = useState({
            width: window.innerWidth,
            height: window.innerHeight,
        });
        useEffect(() => {
            function handleResize() {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            }
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }, []);
        return windowSize;
    }

    async function loadWords() {
        try {
            setLoading(true);
            setError(null);

            // Get all words
            const allWords = await db.getWordsByDeck(deck.id);
            const ratingsSet = new Set(studySettings.ratings || []);
            const now = Date.now();

            // Filter logic
            let filteredWords = allWords.filter(w => {
                const lastRating = w.history?.length > 0 ? w.history[w.history.length - 1].score : 0;

                if (ratingsSet.size > 0) {
                    // Ignore Due Date if filtered by Rating
                    if (lastRating === 0 && ratingsSet.has('new')) return true;
                    if (ratingsSet.has(lastRating)) return true;
                    return false;
                }

                // If no ratings selected, use DEFAULT (Due or New)
                return !w.nextReview || w.nextReview <= now;
            });

            // Sort or Shuffle
            if (studySettings.prioritizeDue) {
                // Split into Due and Not Due
                const due = filteredWords.filter(w => !w.nextReview || w.nextReview <= now).sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
                const notDue = filteredWords.filter(w => w.nextReview > now);
                // Shuffle notDue
                const shuffledNotDue = shuffleArray(notDue);
                // Combine: Due first
                filteredWords = [...due, ...shuffledNotDue];
            } else {
                // Shuffle all
                filteredWords = shuffleArray(filteredWords);
            }

            if (filteredWords.length === 0) {
                setError('no-cards');
            } else {
                setWords(filteredWords);
            }
        } catch (e) {
            console.error('Error loading words:', e);
            setError('load-error');
        } finally {
            setLoading(false);
        }
    }

    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    const handleRate = async (rating) => {
        const currentWord = words[currentIndex];
        if (!currentWord) return;

        // rating: 'skip'/'again', 'hard', 'good', 'easy' (strings) or numbers
        // We map 'skip' to 'again' for consistency in new system

        // Calculate new SRS data
        const updatedWord = updateCard(currentWord, rating);

        // Update DB
        try {
            await db.updateWord(currentWord.id, {
                interval: updatedWord.interval,
                ease: updatedWord.ease,
                reviews: updatedWord.reviews,
                history: updatedWord.history,
                nextReview: updatedWord.nextReview,
                lastRating: updatedWord.lastRating
            });
        } catch (e) {
            console.error('Failed to update word:', e);
        }

        // Update session stats
        // rating might be 'skip' from FlashCard, treat as 'again'
        let statKey = 'again';
        if (rating === 'good' || rating === 3) statKey = 'good';
        else if (rating === 'easy' || rating === 4) statKey = 'easy';
        else if (rating === 'hard' || rating === 2) statKey = 'hard';
        else statKey = 'again'; // skip, 0, 1, or 'again'

        setSessionStats(prev => ({
            ...prev,
            [statKey]: (prev[statKey] || 0) + 1
        }));

        // Move to next card
        if (currentIndex < words.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setFinished(true);
        }
    };

    // Calculate Accuracy: (Good + Easy) / Total
    const totalRated = (sessionStats.good || 0) + (sessionStats.easy || 0) + (sessionStats.hard || 0) + (sessionStats.again || 0);
    const accuracy = totalRated > 0
        ? Math.round((((sessionStats.good || 0) + (sessionStats.easy || 0)) / totalRated) * 100)
        : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-2xl text-gray-500">{t('loading')}</div>
            </div>
        );
    }

    if (error === 'no-cards') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 max-w-md text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">目前沒有符合條件的卡片</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">要不要試試其他過濾選項？或是重置所有篩選？</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={onBackToOptions} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                            {t('backToOptions')}
                        </button>
                        <button onClick={onExit} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition">
                            {t('backToHome')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (finished) {
        const totalCards = words.length;
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;

        const motivationalMsg = getMotivationalMessage(accuracy);

        // Update stats
        updateDailyStreak();
        saveTodayStats({
            cardsCompleted: totalCards,
            timeSpent: totalTime,
            accuracy: accuracy
        });

        const chartData = {
            labels: ['Again', 'Hard', 'Good', 'Easy'],
            datasets: [{
                data: [sessionStats.again || 0, sessionStats.hard || 0, sessionStats.good || 0, sessionStats.easy || 0],
                backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'],
                borderWidth: 0
            }]
        };

        const chartOptions = {
            cutout: '70%',
            plugins: { legend: { display: false } }
        };

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 max-w-4xl w-full relative overflow-hidden flex flex-col md:flex-row gap-12">
                    <Confetti numberOfPieces={200} recycle={false} width={width} height={height} />

                    {/* Left: Summary */}
                    <div className="flex-1 text-center md:text-left z-10">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('reviewComplete')}</h2>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">{motivationalMsg}</p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{words.length}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest">Cards</div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{minutes}:{seconds.toString().padStart(2, '0')}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest">Time</div>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center md:justify-start">
                            <button onClick={onBackToOptions} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition">
                                {t('tryAgain')}
                            </button>
                            <button onClick={onExit} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-8 rounded-lg transition">
                                {t('backToHome')}
                            </button>
                        </div>
                    </div>

                    {/* Right: Chart */}
                    <div className="flex-1 flex flex-col items-center justify-center z-10">
                        <div className="relative w-64 h-64 mb-4">
                            <Doughnut data={chartData} options={chartOptions} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">{accuracy}%</span>
                                <span className="text-sm text-gray-500">Accuracy</span>
                            </div>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Again {sessionStats.again || 0}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Hard {sessionStats.hard || 0}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Good {sessionStats.good || 0}</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Easy {sessionStats.easy || 0}</div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-500">Good ({sessionStats.good || 0}) + Easy ({sessionStats.easy || 0}) / Total ({totalRated})</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    const currentWord = words[currentIndex];

    // Custom Buttons for FlashCard
    // We can't easily inject buttons into FlashCard unless we modify FlashCard to accept 'renderButtons' or similar.
    // Or we handle it by passing specific props.
    // FlashCard currently has hardcoded buttons. 
    // Wait, the prompt says "ReviewSession.jsx ... Update 'Again' button to 'Skip'". 
    // This implies FlashCard is rendering the buttons.
    // I need to modify FlashCard.jsx to accept 'actions' or update the 'Again' button text/icon.
    // BUT user prompt mainly talks about ReviewSession Logic. 
    // Let's modify FlashCard.jsx as well to be consistent. 
    // Or, better, pass a `ratingConfig` prop to FlashCard.

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-3xl mx-auto mb-6">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onExit} className="p-2 -ml-2 text-gray-500 hover:bg-gray-200 rounded-full transition"><X className="w-6 h-6" /></button>
                    <span className="text-gray-500 font-mono">{currentIndex + 1} / {words.length}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                    />
                </div>
            </div>

            {currentWord && (
                <div className="w-full">
                    {(() => {
                        const activeMode = studySettings.mode || 'flashcard';

                        switch (activeMode) {
                            case 'tapping':
                                return (
                                    <TappingQuestion
                                        key={currentWord.id}
                                        word={currentWord}
                                        allModeWords={words}
                                        direction={studySettings.direction}
                                        onResult={handleRate}
                                    />
                                );
                            case 'typing':
                                return (
                                    <TypingQuestion
                                        key={currentWord.id}
                                        word={currentWord}
                                        direction={studySettings.direction}
                                        onResult={handleRate}
                                    />
                                );
                            case 'listening':
                                return (
                                    <ListeningQuestion
                                        key={currentWord.id}
                                        word={currentWord}
                                        deckId={deck.id}
                                        allModeWords={words}
                                        direction={studySettings.direction}
                                        onResult={handleRate}
                                    />
                                );
                            case 'flashcard':
                            default:
                                return (
                                    <FlashCard
                                        key={currentWord.id}
                                        word={currentWord}
                                        direction={studySettings.direction}
                                        onRate={handleRate}
                                    />
                                );
                        }
                    })()}
                </div>
            )}
        </div>
    );
}
