import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function MultipleChoiceQuestion({ word, allModeWords, onResult, direction = 'zh-to-en' }) {
    const { t } = useLanguage();
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(null); // null, or option string
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null); // 'correct' or 'incorrect'

    // Question content
    const questionText = direction === 'zh-to-en' ? word.word : word.translation;
    const correctAns = direction === 'zh-to-en' ? word.translation : word.word;

    useEffect(() => {
        // Generate options: 1 correct + 3 distractors
        const distractors = allModeWords
            .filter(w => w.id !== word.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => direction === 'zh-to-en' ? w.translation : w.word);

        // If not enough words, might have fewer options.
        // That's acceptable for now, handled by UI.

        const allOpts = [...distractors, correctAns].sort(() => 0.5 - Math.random());
        setOptions(allOpts);
        setSelected(null);
        setIsAnswered(false);
        setFeedback(null);
    }, [word, allModeWords, direction]);

    const handleSelect = (option) => {
        if (isAnswered) return;

        setSelected(option);
        setIsAnswered(true);

        const isCorrect = option === correctAns;

        if (isCorrect) {
            setFeedback('correct');
            playSound('correct');
            // Auto advance after animation
            setTimeout(() => {
                onResult(3); // Good
            }, 1000);
        } else {
            setFeedback('incorrect');
            playSound('incorrect');
            // Show correct answer for a bit longer
            setTimeout(() => {
                onResult(2); // Hard
            }, 2500);
        }
    };

    const playSound = (type) => {
        try {
            const audio = new Audio(`/sounds/${type}.mp3`);
            audio.volume = 0.5;
            audio.play().catch(e => console.warn('Audio play failed', e));
        } catch (e) {
            console.warn('Audio error', e);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6 relative">
            {/* Full screen feedback overlay */}
            <AnimatePresence>
                {feedback === 'correct' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-green-500/20 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.5 }} animate={{ scale: 1.2 }}
                            className="bg-white rounded-full p-8 shadow-2xl"
                        >
                            <CheckCircle className="w-24 h-24 text-green-500" />
                        </motion.div>
                    </motion.div>
                )}
                {feedback === 'incorrect' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-red-500/20 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.5 }} animate={{ scale: 1.2 }}
                            className="bg-white rounded-full p-8 shadow-2xl"
                        >
                            <XCircle className="w-24 h-24 text-red-500" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Question Card */}
            <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 w-full text-center mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                key={word.id} // Re-animate on new word
            >
                <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{questionText}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-widest">{t('selectBestMatch')}</p>
            </motion.div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {options.map((opt, idx) => {
                    let btnClass = "p-6 rounded-xl text-lg font-medium transition-all transform hover:scale-[1.02] active:scale-95 border-2 shadow-sm ";

                    if (isAnswered) {
                        if (opt === correctAns) {
                            btnClass += "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-300 ";
                        } else if (opt === selected && opt !== correctAns) {
                            btnClass += "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300 ";
                        } else {
                            btnClass += "bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-800/50 dark:border-gray-700 opacity-50 ";
                        }
                    } else {
                        btnClass += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:shadow-md dark:text-gray-200 ";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            disabled={isAnswered}
                            className={btnClass}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>

            {/* Hint / Explanation on Fail */}
            <AnimatePresence>
                {feedback === 'incorrect' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl text-center"
                    >
                        <p className="text-red-800 dark:text-red-300 font-bold mb-1">Correct Answer:</p>
                        <p className="text-2xl text-red-600 dark:text-red-400 font-bold">{correctAns}</p>
                        {(word.example || word.phonetic) && (
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {word.phonetic && <span className="mr-3 font-mono">[{word.phonetic}]</span>}
                                {word.example && <span>{word.example}</span>}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
