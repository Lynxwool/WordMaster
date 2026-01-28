import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function FillInBlankQuestion({ word, onResult, direction = 'zh-to-en' }) {
    const { t } = useLanguage();
    const [input, setInput] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const inputRef = useRef(null);

    // Target answer
    const target = word.word.trim();
    // Context
    const translation = word.translation;
    const example = word.example || '';

    // Masked example logic
    const getMaskedExample = () => {
        if (!example) return null;
        // Simple case-insensitive replacement
        const regex = new RegExp(target, 'gi');
        return example.replace(regex, '______');
    };

    const maskedEx = getMaskedExample();

    useEffect(() => {
        setInput('');
        setIsAnswered(false);
        setFeedback(null);
        if (inputRef.current) inputRef.current.focus();
    }, [word]);

    const normalize = (str) => str.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isAnswered) return;

        setIsAnswered(true);

        const isCorrect = normalize(input) === normalize(target);

        if (isCorrect) {
            setFeedback('correct');
            playSound('correct');
            setTimeout(() => {
                onResult(3); // Good
            }, 1000);
        } else {
            setFeedback('incorrect');
            playSound('incorrect');
            setTimeout(() => {
                onResult(2); // Hard
            }, 3000); // Longer delay to read correction
        }
    };

    const playSound = (type) => {
        try {
            const audio = new Audio(`/sounds/${type}.mp3`);
            audio.volume = 0.5;
            audio.play().catch(e => console.warn(e));
        } catch (e) { }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6">
            {/* Full screen feedback overlay */}
            <AnimatePresence>
                {feedback === 'correct' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-green-500/20 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1.2 }} className="bg-white rounded-full p-8 shadow-2xl">
                            <CheckCircle className="w-24 h-24 text-green-500" />
                        </motion.div>
                    </motion.div>
                )}
                {feedback === 'incorrect' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-red-500/20 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1.2 }} className="bg-white rounded-full p-8 shadow-2xl">
                            <XCircle className="w-24 h-24 text-red-500" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 w-full text-center mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                key={word.id}
            >
                {/* Prompt */}
                <h3 className="text-xl text-gray-500 dark:text-gray-400 mb-4 font-bold uppercase tracking-widest">{t('typeAnswer')}</h3>

                {maskedEx ? (
                    <div className="text-2xl text-gray-800 dark:text-gray-200 mb-6 font-serif italic">
                        "{maskedEx}"
                    </div>
                ) : (
                    <div className="text-3xl text-gray-800 dark:text-gray-200 mb-6 font-bold">
                        {translation}
                    </div>
                )}

                {/* If example exists, show translation as hint below? */}
                {maskedEx && (
                    <p className="text-gray-400 text-sm mb-6">{translation}</p>
                )}

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isAnswered}
                        placeholder={t('typeHere') || "Type the word..."}
                        className={`w-full p-4 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all ${isAnswered
                                ? feedback === 'correct'
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-200 dark:border-gray-600 dark:bg-gray-700 focus:border-blue-500'
                            }`}
                        autoFocus
                    />

                    {!isAnswered && (
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-bold shadow-md transition-all"
                        >
                            Confirm
                        </button>
                    )}
                </form>

                {/* Answer Reveal */}
                <AnimatePresence>
                    {feedback === 'incorrect' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700"
                        >
                            <p className="text-sm text-gray-500 mb-1">Correct Answer:</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{target}</p>
                            {word.phonetic && <p className="text-gray-400 font-mono mt-1">[{word.phonetic}]</p>}
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </div>
    );
}
