import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Plus, Trash2, Download, Upload } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { db } from '../utils/db';
import { exportDeckToAnkiCSV, exportDeckToJSON, downloadFile } from '../utils/export';
import { parseCSV } from '../utils/csv';
import { updateLastExportDate } from '../utils/stats';

export default function DeckEditor({ deck, onBack }) {
    const { t } = useLanguage();
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [newWord, setNewWord] = useState({ word: '', translation: '', example: '', phonetic: '', tags: '' });

    useEffect(() => {
        loadWords();
    }, [deck.id]);

    async function loadWords() {
        const w = await db.getWordsByDeck(deck.id);
        setWords(w);
        setLoading(false);
    }

    async function handleDelete(wordId) {
        await db.deleteWord(wordId);
        await loadWords();
        setDeleteConfirm(null);
    }

    async function handleAdd() {
        if (!newWord.word.trim() || !newWord.translation.trim()) {
            alert('Please fill word and translation');
            return;
        }
        await db.addWord(deck.id, newWord);
        setNewWord({ word: '', translation: '', example: '', phonetic: '', tags: '' });
        await loadWords();
    }

    async function handleExport(format) {
        try {
            let content, filename, mimeType;

            if (format === 'csv') {
                content = await exportDeckToAnkiCSV(deck.id);
                filename = `${deck.name}_anki.csv`;
                mimeType = 'text/csv;charset=utf-8';
            } else {
                content = await exportDeckToJSON(deck.id);
                filename = `${deck.name}_backup.json`;
                mimeType = 'application/json';
            }

            await downloadFile(content, filename, mimeType);
            updateLastExportDate();
            alert(`✅ ${format.toUpperCase()} exported successfully!`);
        } catch (e) {
            alert('Export failed: ' + e.message);
        }
    }

    async function handleAppendCSV() {
        if (!window.electron?.selectFile) {
            alert('Electron environment required');
            return;
        }

        try {
            const result = await window.electron.selectFile();
            if (!result) return;

            const parseResult = await parseCSV(result.content);
            const newWords = parseResult.words;

            // Check for duplicates
            const existingWords = words.map(w => w.word.toLowerCase());
            const toAdd = newWords.filter(w => !existingWords.includes(w.word.toLowerCase()));
            const duplicates = newWords.length - toAdd.length;

            for (const word of toAdd) {
                await db.addWord(deck.id, word);
            }

            await loadWords();
            alert(`✅ Added ${toAdd.length} words${duplicates > 0 ? `\n⚠️ Skipped ${duplicates} duplicates` : ''}`);
        } catch (e) {
            alert('Import failed: ' + e.message);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <ChevronLeft className="w-5 h-5" /> Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{deck.name} - Editor</h1>
                    <div className="flex gap-2">
                        <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                        <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            <Download className="w-4 h-4" /> Export JSON
                        </button>
                        <button onClick={handleAppendCSV} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            <Upload className="w-4 h-4" /> Append CSV
                        </button>
                    </div>
                </div>

                {/* Words Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
                    <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Word</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Translation</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Example</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Phonetic</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Tags</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {words.map((word, idx) => (
                                <tr key={word.id} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'} border-t border-gray-200 dark:border-gray-700`}>
                                    <td className="px-4 py-3 font-medium">{word.word}</td>
                                    <td className="px-4 py-3">{word.translation}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">{word.example}</td>
                                    <td className="px-4 py-3 text-sm">{word.phonetic}</td>
                                    <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">{word.tags}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => setDeleteConfirm(word.id)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Add Word Form */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4">Add New Word</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <input type="text" placeholder="Word*" value={newWord.word} onChange={(e) => setNewWord({ ...newWord, word: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                        <input type="text" placeholder="Translation*" value={newWord.translation} onChange={(e) => setNewWord({ ...newWord, translation: e.target.value })} className="px-3 py-2 rounded-lg border" />
                        <input type="text" placeholder="Example" value={newWord.example} onChange={(e) => setNewWord({ ...newWord, example: e.target.value })} className="px-3 py-2 rounded-lg border" />
                        <input type="text" placeholder="Phonetic" value={newWord.phonetic} onChange={(e) => setNewWord({ ...newWord, phonetic: e.target.value })} className="px-3 py-2 rounded-lg border" />
                        <input type="text" placeholder="Tags" value={newWord.tags} onChange={(e) => setNewWord({ ...newWord, tags: e.target.value })} className="px-3 py-2 rounded-lg border" />
                    </div>
                    <button onClick={handleAdd} className="mt-4 flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Plus className="w-4 h-4" /> Add Word
                    </button>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-4">Confirm Delete?</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">This word will be permanently deleted.</p>
                            <div className="flex gap-4">
                                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Delete</button>
                                <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-gray-300 dark:bg-gray-600 py-2 rounded-lg">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
