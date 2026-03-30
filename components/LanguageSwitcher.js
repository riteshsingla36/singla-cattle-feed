'use client';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/LanguageContext';

export const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  const languages = [
    { code: 'en', name: t('english') },
    { code: 'hi', name: t('hindi') },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];
  const otherLang = languages.find((l) => l.code !== language) || languages[0];

  const handleToggle = () => {
    changeLanguage(otherLang.code);
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-500 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-800 transition-colors"
      title={t('switchLanguage')}
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
  );
};
