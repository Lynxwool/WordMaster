import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export default function CsvHelpModal({ isOpen, onClose }) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const downloadSample = () => {
        const sampleContent = `word,translation,example,phonetic,tags\napple,蘋果,I ate an apple.,/ˈæp.l/,fruit\nbook,書,This contains many words.,/bʊk/,study\ncomputer,電腦,Electronic device for processing data.,/kəmˈpjuː.tər/,tech\nrun,跑,He likes to run in the park.,/rʌn/,action\nhappy,快樂,She felt very happy today.,/ˈhæp.i/,emotion`;

        const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'wordmaster_sample.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CSV 格式說明</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto p-8 space-y-8">

                        {/* Section 1: Basic Requirements */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                                基本要求
                            </h3>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600 dark:text-gray-300 ml-2">
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    檔案格式：<code className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-sm font-mono text-pink-500">.csv</code>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    編碼格式：<span className="font-semibold text-blue-600 dark:text-blue-400">UTF-8</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    欄位分隔符：逗號 (Comma)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                    <span className="text-red-500 font-medium">第一行必須是欄位標頭</span>
                                </li>
                            </ul>
                        </section>

                        <hr className="border-gray-100 dark:border-gray-700" />

                        {/* Section 2: Fields */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <div className="w-1.5 h-6 bg-green-500 rounded-full"></div>
                                欄位說明
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                                    <div className="text-green-700 dark:text-green-400 font-bold mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> 必填欄位 (Required)
                                    </div>
                                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                        <li><strong className="font-mono text-gray-900 dark:text-white">word</strong> : 英文單字或短語</li>
                                        <li><strong className="font-mono text-gray-900 dark:text-white">translation</strong> : 中文翻譯</li>
                                    </ul>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-600/30">
                                    <div className="text-gray-600 dark:text-gray-300 font-bold mb-2 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" /> 選填欄位 (Optional)
                                    </div>
                                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <li><strong className="font-mono">example</strong> : 例句</li>
                                        <li><strong className="font-mono">phonetic</strong> : 音標</li>
                                        <li><strong className="font-mono">tags</strong> : 標籤 (e.g. fruit, verb)</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Anki Tip */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800 dark:text-blue-200">
                                <div className="bg-blue-100 dark:bg-blue-800 p-1 rounded mt-0.5">
                                    <span className="font-bold text-xs uppercase">Anki</span>
                                </div>
                                <div>
                                    <span className="font-bold">支援 Anki 格式！</span> 系統會自動對應：Front → word, Back → translation, Extra → example + phonetic (自動解析)。
                                </div>
                            </div>
                        </section>

                        <hr className="border-gray-100 dark:border-gray-700" />

                        {/* Section 3: Example Table */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                                範例預覽
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">word</th>
                                            <th className="px-4 py-3 font-semibold">translation</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">example</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">phonetic</th>
                                            <th className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400">tags</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        <tr>
                                            <td className="px-4 py-3 font-medium">apple</td>
                                            <td className="px-4 py-3">蘋果</td>
                                            <td className="px-4 py-3 text-gray-500 italic">I ate an apple.</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono">/ˈæp.l/</td>
                                            <td className="px-4 py-3 text-blue-500">fruit</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-medium">book</td>
                                            <td className="px-4 py-3">書</td>
                                            <td className="px-4 py-3 text-gray-500 italic">This is a book.</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono">/bʊk/</td>
                                            <td className="px-4 py-3 text-blue-500">study</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-medium">run</td>
                                            <td className="px-4 py-3">跑</td>
                                            <td className="px-4 py-3 text-gray-500 italic">He likes to run.</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono">/rʌn/</td>
                                            <td className="px-4 py-3 text-blue-500">verb</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex justify-end">
                        <button
                            onClick={downloadSample}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-green-500/20 active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                            下載範例 CSV (Download Sample)
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
