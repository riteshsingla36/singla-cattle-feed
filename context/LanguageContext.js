'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || 'en');

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLanguage(lng);
    document.cookie = `i18next=${lng};path=/;max-age=31536000`;
  };

  useEffect(() => {
    const savedLang = document.cookie.match(/i18next=([^;]+)/);
    if (savedLang && savedLang[1]) {
      changeLanguage(savedLang[1]);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
