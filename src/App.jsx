import React, { useState, useEffect } from 'react';
import { Moon, Sun, Languages } from 'lucide-react';
import Dashboard from './components/Dashboard';
import StudyOptions from './components/StudyOptions';
import ReviewSession from './components/ReviewSession';
import DeckEditor from './components/DeckEditor';
import { LanguageProvider, useLanguage } from './hooks/useLanguage';

function AppContent() {
  const { language, switchLanguage } = useLanguage();
  const [currentDeck, setCurrentDeck] = useState(null);
  const [studySettings, setStudySettings] = useState(null);
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('dashboard'); // 'dashboard', 'options', 'review', 'editor'

  useEffect(() => {
    // Load theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelectDeck = (deck) => {
    setCurrentDeck(deck);
    setView('options');
  };

  const handleStartStudy = (settings) => {
    setStudySettings(settings);
    setView('review');
  };

  const handleBackToDashboard = () => {
    setCurrentDeck(null);
    setStudySettings(null);
    setView('dashboard');
  };

  const handleBackToOptions = () => {
    setView('options');
  };

  const handleEditDeck = (deck) => {
    setCurrentDeck(deck);
    setView('editor');
  };

  const handleBackFromEditor = () => {
    setCurrentDeck(null);
    setView('dashboard');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors font-sans select-none">
      {/* Header Controls (only on dashboard) */}
      {view === 'dashboard' && (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          {/* Language Switcher */}
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => switchLanguage('zh')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg transition ${language === 'zh'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              中文
            </button>
            <button
              onClick={() => switchLanguage('en')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg transition ${language === 'en'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              English
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
            ) : (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}

      <main className="h-full w-full">
        {view === 'dashboard' && (
          <Dashboard onSelectDeck={handleSelectDeck} onEditDeck={handleEditDeck} />
        )}

        {view === 'options' && currentDeck && (
          <StudyOptions
            deck={currentDeck}
            onStart={handleStartStudy}
            onBack={handleBackToDashboard}
          />
        )}

        {view === 'review' && currentDeck && studySettings && (
          <ReviewSession
            deck={currentDeck}
            studySettings={studySettings}
            onExit={handleBackToDashboard}
            onBackToOptions={handleBackToOptions}
          />
        )}

        {view === 'editor' && currentDeck && (
          <DeckEditor
            deck={currentDeck}
            onBack={handleBackFromEditor}
          />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;

