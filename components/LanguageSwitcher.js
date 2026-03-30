'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

export const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: t('english') },
    { code: 'hi', name: t('hindi') },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800 transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{currentLang.name}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                language === lang.code ? 'bg-blue-50 dark:bg-blue-900 font-semibold' : ''
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
