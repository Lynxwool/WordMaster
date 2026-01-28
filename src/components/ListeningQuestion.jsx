import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Volume2 } from 'lucide-react';

export default function ListeningQuestion({ word, deckId, allModeWords, onResult, direction = 'zh-to-en' }) {
    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [audioPlayed, setAudioPlayed] = useState(false);

    const correctAns = direction === 'zh-to-en' ? word.translation : word.word;

    useEffect(() => {
        // Generate options
        const distractors = allModeWords
            .filter(w => w.id !== word.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(w => direction === 'zh-to-en' ? w.translation : w.word);

        const allOpts = [...distractors, correctAns].sort(() => 0.5 - Math.random());
        setOptions(allOpts);
        setSelected(null);
        setIsAnswered(false);
        setFeedback(null);
        setAudioPlayed(false);

        // Auto-play audio on load
        setTimeout(() => playAudio(), 500);
    }, [word]);

    const playAudio = () => {
        setAudioPlayed(true);

        // Try local audio first, fallback to TTS
        if (word.audio && deckId) {
            const audio = new Audio(`/media/${deckId}/${word.audio}`);
            audio.play().catch(err => {
                console.warn('Local audio failed, using TTS', err);
                useTTS();
            });
        } else {
            useTTS();
        }
    };

    const useTTS = () => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleSelect = (option) => {
        if (isAnswered) return;

        setSelected(option);
        setIsAnswered(true);

        const isCorrect = option === correctAns;
        setFeedback(isCorrect ? 'correct' : 'incorrect');

        playSound(isCorrect ? 'correct' : 'incorrect');

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
        <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-6 relative">
            {/* Feedback overlay */}
            <AnimatePresence>
                {feedback === 'correct' && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-green-500/10 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.3 }}>
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        </motion.div>
                    </motion.div>
                )}
                {feedback === 'incorrect' && (
                    <motion.div
                        animate={{ x: [0, -10, 10, -10, 10, 0] }}
                        transition={{ duration: 0.4 }}
                        className="fixed inset-0 bg-red-500/10 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <XCircle className="w-16 h-16 text-red-500" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Audio prompt */}
            <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 w-full text-center mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                key={word.id}
            >
                <button
                    onClick={playAudio}
                    className="mx-auto mb-4 bg-blue-500 hover:bg-blue-600 text-white p-8 rounded-full shadow-lg transition transform hover:scale-110 active:scale-95"
                >
                    <Volume2 className="w-12 h-12" />
                </button>
                <p className="text-gray-400 text-sm uppercase tracking-widest">LISTEN & SELECT</p>
            </motion.div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {options.map((opt, idx) => {
                    let btnClass = "p-6 rounded-xl text-xl font-bold transition-all transform active:scale-95 border-2 ";

                    if (isAnswered) {
                        if (opt === correctAns) btnClass += "bg-green-100 border-green-500 text-green-800 scale-105 ";
                        else if (opt === selected) btnClass += "bg-red-100 border-red-500 text-red-800 ";
                        else btnClass += "bg-gray-50 border-gray-200 text-gray-400 opacity-40 ";
                    } else {
                        btnClass += "bg-white dark:bg-gray-800 border-gray-200 hover:border-blue-400 hover:scale-105 ";
                    }

                    return (
                        <motion.button
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            disabled={isAnswered}
                            className={btnClass}
                            whileHover={!isAnswered ? { scale: 1.05 } : {}}
                        >
                            {opt}
                        </motion.button>
                    );
                })}
            </div>

            {feedback === 'incorrect' && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-sm text-gray-400"
                >
                    Correct: <span className="text-green-600 font-bold">{correctAns}</span>
                </motion.p>
            )}
        </div>
    );
}
