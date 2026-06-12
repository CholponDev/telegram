import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AppSettingsContext = createContext(null);

const translations = {
  ru: {
    profile: "Профиль",
    myProfile: "Мой профиль",
    settings: "Настройки",
    chats: "Чаты",
    privacy: "Конфиденциальность",
    theme: "Тема",
    language: "Язык",
    help: "Помощь",
    support: "Служба поддержки",
    logout: "Выйти",
    search: "Поиск",
    searchPlaceholder: "Поиск по email, телефону или имени",
    contacts: "Контакты",
    noContacts: "Контактов пока нет",
    chooseChat: "Выберите чат",
    chooseChatText: "Или найдите пользователя через поиск.",
    messagePlaceholder: "Напишите сообщение...",
    send: "Отправить",
    save: "Сохранить",
    back: "← Назад",
    lightTheme: "Светлая тема",
    darkTheme: "Тёмная тема",
    systemTheme: "Системная тема",
    russian: "Русский",
    kyrgyz: "Кыргызский",
    english: "Английский",
    loginTitle: "Вход",
emailPlaceholder: "Email",
passwordPlaceholder: "Пароль",
loginButton: "Войти",
noAccount: "Нет аккаунта?",
register: "Регистрация",
forgotPassword: "Забыли пароль?",
wrongLogin: "Неверный email или пароль",
invalidEmail: "Введите правильный email",
loginError: "Ошибка входа",
  },

  kg: {
    profile: "Профиль",
    myProfile: "Менин профилим",
    settings: "Жөндөөлөр",
    chats: "Чаттар",
    privacy: "Купуялуулук",
    theme: "Тема",
    language: "Тил",
    help: "Жардам",
    support: "Колдоо кызматы",
    logout: "Чыгуу",
    search: "Издөө",
    searchPlaceholder: "Email, телефон же аты боюнча издөө",
    contacts: "Байланыштар",
    noContacts: "Байланыштар азырынча жок",
    chooseChat: "Чатты тандаңыз",
    chooseChatText: "Же колдонуучуну издөө аркылуу табыңыз.",
    messagePlaceholder: "Билдирүү жазыңыз...",
    send: "Жөнөтүү",
    save: "Сактоо",
    back: "← Артка",
    lightTheme: "Жарык тема",
    darkTheme: "Караңгы тема",
    systemTheme: "Системалык тема",
    russian: "Орусча",
    kyrgyz: "Кыргызча",
    english: "Англисче",
    loginTitle: "Кирүү",
emailPlaceholder: "Email",
passwordPlaceholder: "Сыр сөз",
loginButton: "Кирүү",
noAccount: "Аккаунтуңуз жокпу?",
register: "Катталуу",
forgotPassword: "Сыр сөздү унуттуңузбу?",
wrongLogin: "Email же сыр сөз туура эмес",
invalidEmail: "Email дарегин туура жазыңыз",
loginError: "Кирүүдө ката кетти",
  },

  en: {
    profile: "Profile",
    myProfile: "My profile",
    settings: "Settings",
    chats: "Chats",
    privacy: "Privacy",
    theme: "Theme",
    language: "Language",
    help: "Help",
    support: "Support",
    logout: "Log out",
    search: "Search",
    searchPlaceholder: "Search by email, phone or name",
    contacts: "Contacts",
    noContacts: "No contacts yet",
    chooseChat: "Choose a chat",
    chooseChatText: "Or find a user using search.",
    messagePlaceholder: "Write a message...",
    send: "Send",
    save: "Save",
    back: "← Back",
    lightTheme: "Light theme",
    darkTheme: "Dark theme",
    systemTheme: "System theme",
    russian: "Russian",
    kyrgyz: "Kyrgyz",
    english: "English",
    loginTitle: "Login",
emailPlaceholder: "Email",
passwordPlaceholder: "Password",
loginButton: "Login",
noAccount: "Don't have an account?",
register: "Register",
forgotPassword: "Forgot password?",
wrongLogin: "Incorrect email or password",
invalidEmail: "Enter a valid email",
loginError: "Login error",
  },
};

export function AppSettingsProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("chatThemeMode") || "system";
  });

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("chatLanguage") || "ru";
  });

  const [systemTheme, setSystemTheme] = useState("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();

    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  const activeTheme = themeMode === "system" ? systemTheme : themeMode;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    document.documentElement.setAttribute("lang", language);
  }, [activeTheme, language]);

  const changeTheme = (value) => {
    setThemeMode(value);
    localStorage.setItem("chatThemeMode", value);
  };

  const changeLanguage = (value) => {
    setLanguage(value);
    localStorage.setItem("chatLanguage", value);
  };

  const t = useMemo(() => {
    return (key) => {
      return translations[language]?.[key] || translations.ru[key] || key;
    };
  }, [language]);

  const value = {
    themeMode,
    activeTheme,
    changeTheme,
    language,
    changeLanguage,
    t,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error("useAppSettings должен использоваться внутри AppSettingsProvider");
  }

  return context;
}