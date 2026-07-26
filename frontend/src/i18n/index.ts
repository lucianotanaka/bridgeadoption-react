import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "pt",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
      convertDetectedLanguage: (lng: string) => {
        // Map full codes like "pt-BR" → "pt", "en-US" → "en", "es-ES" → "es"
        if (lng.startsWith("pt")) return "pt";
        if (lng.startsWith("en")) return "en";
        if (lng.startsWith("es")) return "es";
        return "pt";
      },
    },
  });

export default i18n;
