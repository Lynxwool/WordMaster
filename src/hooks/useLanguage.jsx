import { createContext, useContext, useState, useEffect } from 'react';
import { zh } from '../locales/zh';
import { en } from '../locales/en';

const translations = { zh, en };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('zh');

    useEffect(() => {
        // Load from localStorage or detect from browser
        const saved = localStorage.getItem('language');
        if (saved && translations[saved]) {
            setLanguage(saved);
        } else {
            // Detect browser language
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('zh')) {
                setLanguage('zh');
            } else {
                setLanguage('en');
            }
        }
    }, []);

    const switchLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
            localStorage.setItem('language', lang);
        }
    };

    const t = (key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
