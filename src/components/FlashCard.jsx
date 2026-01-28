import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, SkipForward } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function FlashCard({ word, direction = 'zh-to-en', onRate }) {
    const { t } = useLanguage();
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [ttsSupported, setTtsSupported] = useState(true);

    // Reset flip state when word changes
    useEffect(() => {
        setIsFlipped(false);
        setIsPlaying(false);

        // Check TTS support
        if (!('speechSynthesis' in window)) {
            setTtsSupported(false);
        }
    }, [word.id]);

    const playTTS = (e) => {
        e?.stopPropagation();

        if (!ttsSupported || !word.word) {
            console.warn('TTS not supported or no word');
            return;
        }

        try {
            setIsPlaying(true);
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;

            utterance.onend = () => setIsPlaying(false);
            utterance.onerror = () => {
                setIsPlaying(false);
                setTtsSupported(false);
            };

            window.speechSynthesis.cancel(); // Cancel any ongoing speech
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('TTS error:', e);
            setIsPlaying(false);
            setTtsSupported(false);
        }
    };

    const handleFlip = () => {
        if (!isFlipped) {
            new Audio('/sounds/flip.mp3').play().catch(e => console.warn('Audio error:', e));
            setIsFlipped(true);
        }
    };

    const handleRate = (rating) => {
        new Audio('/sounds/click.mp3').play().catch(e => console.warn('Audio error:', e));
        onRate(rating);
        setIsFlipped(false);
    };

    // Determine card content based on direction
    const getFrontContent = () => {
        if (direction === 'zh-to-en') {
            return {
                main: word.translation,
                showTTS: false
            };
        } else {
            return {
                main: word.word,
                sub: word.phonetic,
                showTTS: true
            };
        }
    };

    const getBackContent = () => {
        if (direction === 'zh-to-en') {
            return {
                main: word.word,
                sub: word.phonetic,
                example: word.example,
                showTTS: true
            };
        } else {
            return {
                main: word.translation,
                example: word.example,
                tags: word.tags,
                showTTS: false
            };
        }
    };

    const front = getFrontContent();
    const back = getBackContent();

    return (
        <div className="flex flex-col items-center justify-center h-full px-4">
            {/* Flashcard */}
            <div
                className="w-full max-w-3xl mb-8"
                style={{ perspective: '1000px' }}
            >
                <motion.div
                    className="relative w-full min-h-[60vh] cursor-pointer"
                    onClick={isFlipped ? undefined : handleFlip}
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front Face */}
                    <motion.div
                        className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col items-center justify-center p-12 border border-gray-200 dark:border-gray-700"
                        style={{ backfaceVisibility: 'hidden', willChange: 'transform' }}
                    >
                        <h2 className="text-6xl font-bold text-gray-900 dark:text-white text-center mb-6">
                            {front.main}
                        </h2>
                        {front.sub && (
                            <p className="text-2xl text-gray-500 dark:text-gray-400 font-mono mb-6">
                                /{front.sub}/
                            </p>
                        )}
                        {front.showTTS && (
                            <button
                                onClick={playTTS}
                                className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition group"
                                title={ttsSupported ? 'Play pronunciation' : t('cannotPlay')}
                                disabled={!ttsSupported}
                            >
                                <Volume2
                                    className={`w-8 h-8 transition ${!ttsSupported ? 'text-gray-300 dark:text-gray-600' :
                                        isPlaying ? 'text-blue-600 dark:text-blue-400' :
                                            'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                        }`}
                                    strokeWidth={1.5}
                                />
                            </button>
                        )}
                        {!isFlipped && (
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-8">
                                {t('tapToFlip')}
                            </p>
                        )}
                    </motion.div>

                    {/* Back Face */}
                    <motion.div
                        className="absolute inset-0 bg-blue-50 dark:bg-gray-800 rounded-xl shadow-sm flex flex-col items-center justify-center p-12 border border-blue-200 dark:border-blue-900"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', willChange: 'transform' }}
                    >
                        <h3 className="text-5xl font-bold text-gray-900 dark:text-white text-center mb-4">
                            {back.main}
                        </h3>
                        {back.sub && (
                            <p className="text-xl text-gray-600 dark:text-gray-300 font-mono mb-6">
                                /{back.sub}/
                            </p>
                        )}
                        {back.example && (
                            <div className="bg-white/80 dark:bg-gray-700/50 p-6 rounded-lg max-w-2xl w-full mt-4">
                                <p className="text-lg text-gray-700 dark:text-gray-300 italic text-center">
                                    "{back.example}"
                                </p>
                            </div>
                        )}

                        {back.tags && (
                            <div className="mt-4 text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-900/50 px-2 py-1 rounded">
                                Tags: {back.tags}
                            </div>
                        )}

                        {/* TTS Button */}
                        {back.showTTS && (
                            <button
                                onClick={playTTS}
                                className="mt-6 p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 transition group"
                                title={ttsSupported ? 'Play pronunciation' : t('cannotPlay')}
                                disabled={!ttsSupported}
                            >
                                <Volume2
                                    className={`w-8 h-8 transition ${!ttsSupported ? 'text-gray-300 dark:text-gray-600' :
                                        isPlaying ? 'text-blue-600 dark:text-blue-400' :
                                            'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                        }`}
                                    strokeWidth={1.5}
                                />
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            </div>

            {/* Rating Buttons (only show when flipped) */}
            {isFlipped && (
                <motion.div
                    className="w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <button
                        onClick={() => handleRate('skip')} // Changed from 'again'
                        className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 font-bold py-4 px-4 rounded-xl transition transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-1"
                    >
                        <SkipForward className="w-6 h-6" />
                        <span className="text-sm">Skip</span>
                    </button>

                    <button
                        onClick={() => handleRate('hard')}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-lg transition transform hover:scale-105 active:scale-95"
                    >
                        {t('hard')}
                    </button>

                    <button
                        onClick={() => handleRate('good')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg transition transform hover:scale-105 active:scale-95"
                    >
                        {t('good')}
                    </button>

                    <button
                        onClick={() => handleRate('easy')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg transition transform hover:scale-105 active:scale-95"
                    >
                        {t('easy')}
                    </button>
                </motion.div>
            )}
        </div>
    );
}
