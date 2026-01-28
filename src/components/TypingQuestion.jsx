import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

export default function TypingQuestion({ word, onResult, direction = 'zh-to-en' }) {
    const [input, setInput] = useState('');
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const inputRef = useRef(null);

    const target = word.word.trim();
    const translation = word.translation;

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

        setFeedback(isCorrect ? 'correct' : 'incorrect');
        playSound(isCorrect ? 'correct' : 'incorrect');

        // Fast feedback: 0.3s correct, 0.5s incorrect
        setTimeout(() => {
            onResult(isCorrect ? 3 : 2);
        }, isCorrect ? 300 : 500);
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
            {/* Fast feedback */}
            <AnimatePresence>
                {feedback === 'correct' && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-green-500/10 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-full p-6 shadow-2xl"
                        >
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        </motion.div>
                    </motion.div>
                )}
                {feedback === 'incorrect' && (
                    <motion.div
                        animate={{ x: [0, -10, 10, -5, 5, 0] }}
                        transition={{ duration: 0.4 }}
                        className="fixed inset-0 bg-red-500/10 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <XCircle className="w-16 h-16 text-red-500" />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 w-full text-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                key={word.id}
            >
                <h3 className="text-sm text-gray-500 mb-4 uppercase tracking-widest">TYPE THE WORD</h3>
                <div className="text-3xl text-gray-800 dark:text-gray-200 mb-6 font-bold">{translation}</div>

                <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isAnswered}
                        placeholder="Type here..."
                        className={`w-full p-4 text-center text-2xl font-bold rounded-xl border-2 outline-none transition ${isAnswered
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
                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition"
                        >
                            Check
                        </button>
                    )}
                </form>

                {/* Show answer on incorrect */}
                {feedback === 'incorrect' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 text-green-600 font-bold text-xl"
                    >
                        ✓ {target}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
