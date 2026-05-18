"use client";
import { createContext, useContext } from "react";
import { translations, DEFAULT_LOCALE } from "./translations";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  t: translations[DEFAULT_LOCALE],
});

export function useT() {
  return useContext(LocaleContext);
}

export default function LocaleProvider({ locale, children }) {
  const t = translations[locale] ?? translations[DEFAULT_LOCALE];
  return (
    <LocaleContext.Provider value={{ locale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
