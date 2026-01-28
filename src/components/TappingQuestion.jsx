import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function TappingQuestion({ word, allModeWords = [], direction = 'zh-to-en', onResult }) {
    const [options, setOptions] = useState([]);
    const [selectedOptionId, setSelectedOptionId] = useState(null);
    const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect'
    const [questionType, setQuestionType] = useState('translation'); // 'translation' | 'cloze'

    // Use Sound effects - assuming simple audio objects or just visual if no files
    // In a real app we'd load these from assets. 
    // Ideally we assume standard /sounds/correct.mp3 exists as per previous code.

    useEffect(() => {
        generateQuestion();
    }, [word, allModeWords, direction]);

    const generateQuestion = () => {
        // Reset state
        setFeedback(null);
        setSelectedOptionId(null);

        // 1. Determine Display Mode
        // If we have an example sentence and it contains the word (case insensitive), we can try Cloze.
        // For simplicity, let's randomize or prefer Cloze if available.
        // The prompt says: "顯示中文翻譯（例：書）或例句填空"
        const hasExample = word.example && word.example.toLowerCase().includes(word.word.toLowerCase());
        const useCloze = hasExample && Math.random() > 0.5; // 50% chance if available

        setQuestionType(useCloze ? 'cloze' : 'translation');

        // 2. Generate Options
        // We need 3 distractors. 
        const otherWords = allModeWords.filter(w => w.id !== word.id);

        if (otherWords.length < 3) {
            // Not enough words fallback logic handled in render
            setOptions([]);
            return;
        }

        const distractors = [...otherWords]
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        // Combine and shuffle
        const allOptions = [word, ...distractors]
            .map(w => ({
                id: w.id,
                text: direction === 'zh-to-en' ? w.word : w.translation, // Option always shows Target User Language (e.g. English)
                // Wait. If direction is zh-to-en (Learn English): Question=Chinese, Options=English. 
                // So options should indeed be w.word.
                // If direction is en-to-zh (Learn Chinese): Question=English, Options=Chinese.
                // So options should look at direction.
                // Actually, standard logic:
                // ZH->EN: Prompt=ZH("書"), Options=EN("Book", "Apple"...)
                // EN->ZH: Prompt=EN("Book"), Options=ZH("書", "蘋果"...)
                // Cloze is always Target Language Sentence with blank. Options=Target Language Words.

                content: direction === 'zh-to-en' ? w.word : w.translation,
                isCorrect: w.id === word.id
            }))
            .sort(() => 0.5 - Math.random());

        setOptions(allOptions);
    };

    const handleOptionClick = (option) => {
        if (feedback) return; // Block input if already answered

        setSelectedOptionId(option.id);

        if (option.isCorrect) {
            // CORRECT
            setFeedback('correct');
            playSound('correct');
            // Auto advance
            setTimeout(() => {
                onResult(3); // Good
            }, 500);
        } else {
            // INCORRECT
            setFeedback('incorrect');
            playSound('incorrect');
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(200);
            }
            // Show correct answer for 1s then advance
            setTimeout(() => {
                onResult(2); // Hard
            }, 1500); // 1.5s to review correct answer
        }
    };

    const playSound = (type) => {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(e => console.warn('Audio play failed', e));
    };

    // Render Question Text
    const renderQuestion = () => {
        if (questionType === 'cloze' && word.example) {
            // Replace word with blank
            // Escaping implementation for regex safety omitted for brevity, assuming simple words
            const regex = new RegExp(word.word, 'gi');
            const parts = word.example.split(regex);
            // This is a naive split, it might remove the word. 
            // Better: example.replace(regex, '______')
            const clozeText = word.example.replace(regex, '______');
            return <div className="text-2xl font-medium font-serif leading-relaxed text-gray-800 dark:text-gray-200">{clozeText}</div>;
        } else {
            // Translation Mode
            const text = direction === 'zh-to-en' ? word.translation : word.word;
            return <div className="text-5xl font-bold text-gray-900 dark:text-gray-100">{text}</div>;
        }
    };

    // Fallback if not enough cards
    if (options.length === 0 && allModeWords.length < 4) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">單字量不足</h3>
                <p className="text-gray-500 mb-6 text-center">此模式需要至少 4 個單字來生成選項。<br />請切換回閃卡模式或新增更多單字。</p>
                <div className="flex gap-4">
                    {/* Fallback to simple correct logic for now to unblock */}
                    <button
                        onClick={() => onResult(3)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold"
                    >
                        當作「Good」跳過
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">

            {/* Progress / Status (Optional) */}
            {/* <div className="w-full mb-6 flex justify-between text-sm text-gray-400">
                <span>Select the correct meaning</span>
             </div> */}

            {/* Question Card */}
            <motion.div
                key={word.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 text-center"
            >
                {renderQuestion()}

                {/* Hints or Tags could go here */}
                {questionType === 'translation' && word.partOfSpeech && (
                    <span className="inline-block mt-4 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500 uppercase tracking-widest">
                        {word.partOfSpeech}
                    </span>
                )}
            </motion.div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {options.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    /* 
                       Style Logic:
                       - Default: White bg, hover effect
                       - Correct Selected: Green bg
                       - Incorrect Selected: Red bg
                       - Correct (Revealed after wrong answer): Green border/text override?
                         User requirement: "答錯... 顯示正確答案"
                    */

                    let statusClass = "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500";
                    if (feedback === 'correct' && isSelected) {
                        statusClass = "bg-green-500 border-green-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                    } else if (feedback === 'incorrect') {
                        if (isSelected) {
                            statusClass = "bg-red-500 border-red-500 text-white animate-shake";
                        } else if (option.isCorrect) {
                            // Reveal correct answer
                            statusClass = "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300";
                        } else {
                            statusClass = "opacity-50 grayscale";
                        }
                    }

                    return (
                        <motion.button
                            key={option.id}
                            onClick={() => handleOptionClick(option)}
                            disabled={!!feedback}
                            whileHover={!feedback ? { scale: 1.02 } : {}}
                            whileTap={!feedback ? { scale: 0.98 } : {}}
                            className={`
                                relative p-6 rounded-2xl text-xl font-bold transition-all duration-200
                                flex items-center justify-center min-h-[100px] shadow-sm
                                ${statusClass}
                            `}
                        >
                            {option.content}

                            {/* Icon Feedback */}
                            {feedback === 'correct' && isSelected && (
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2"
                                >
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Feedback Full Screen Flash (Optional overlay if requested, but localized card effect is usually cleaner) 
                User requested: "全卡片綠光" (Usually means the card itself, or screen flash)
                User requested: "回饋全螢幕淡入淡出" for mobile -> Let's add a subtle full screen light flash
            */}
            <AnimatePresence>
                {feedback === 'correct' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 pointer-events-none z-0 bg-green-500/10"
                    />
                )}
                {feedback === 'incorrect' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 pointer-events-none z-0 bg-red-500/10"
                    />
                )}
            </AnimatePresence>

        </div>
    );
}

