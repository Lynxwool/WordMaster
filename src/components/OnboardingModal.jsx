import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, BookOpen, Upload, Play, Star } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function OnboardingModal({ isOpen, onClose }) {
    const { t } = useLanguage();
    const [step, setStep] = useState(0);

    // Reset step when opened
    useEffect(() => {
        if (isOpen) setStep(0);
    }, [isOpen]);

    if (!isOpen) return null;

    const steps = [
        {
            icon: <BookOpen className="w-16 h-16 text-green-500" />,
            title: "歡迎使用 WordMaster！",
            desc: "輕鬆背單字，支援中英雙向學習。極簡設計，專注記憶。",
            color: "bg-green-50 dark:bg-green-900/20"
        },
        {
            icon: <Upload className="w-16 h-16 text-blue-500" />,
            title: "匯入單字庫",
            desc: "點擊「+ Import Deck」匯入您的 CSV 單字表。我們支援 Anki 格式！",
            color: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            icon: <Play className="w-16 h-16 text-purple-500" />,
            title: "開始學習",
            desc: "選擇 Deck，設定學習方向。複習時點擊卡片翻轉，英文面支援發音播放。",
            color: "bg-purple-50 dark:bg-purple-900/20"
        },
        {
            icon: <Star className="w-16 h-16 text-orange-500" />,
            title: "準備好了嗎？",
            desc: "開始您的單字記憶之旅吧！記得每天回來複習喔。",
            color: "bg-orange-50 dark:bg-orange-900/20"
        }
    ];

    const currentStep = steps[step];
    const isLastStep = step === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            localStorage.setItem('onboarding_seen', 'true');
            onClose();
        } else {
            setStep(s => s + 1);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md mx-6">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center overflow-hidden min-h-[420px]"
                    >
                        {/* Step Indicator */}
                        <div className="flex gap-2 mb-8">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-green-500' : 'w-2 bg-gray-200 dark:bg-gray-700'}`}
                                />
                            ))}
                        </div>

                        {/* Icon */}
                        <div className={`mb-8 p-6 rounded-full ${currentStep.color} transform transition-transform duration-500 hover:scale-110`}>
                            {currentStep.icon}
                        </div>

                        {/* Text */}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            {currentStep.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed mb-auto">
                            {currentStep.desc}
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={handleNext}
                            className="mt-8 w-full py-3.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2 group"
                        >
                            {isLastStep ? (
                                <>
                                    開始使用 <Check className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    下一步 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
