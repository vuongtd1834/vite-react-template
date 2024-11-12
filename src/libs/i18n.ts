import i18n, { type InitOptions } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend, { type HttpBackendOptions } from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import { isProduction } from '@/constants/common';
import { defaultNS, namespaces } from '@/constants/i18n';

const i18nOptions: InitOptions<HttpBackendOptions> = {
  defaultNS,
  lng: 'ja',
  ns: namespaces, // Namespaces used in your structure
  debug: !isProduction,
  fallbackLng: 'ja',
  supportedLngs: ['en', 'ja'],
  interpolation: {
    escapeValue: false,
  },
  backend: {
    // Adjusted load path for new folder structure
    loadPath: isProduction
      ? 'locales/{{lng}}/{{ns}}.json' // Production path
      : 'src/assets/locales/{{lng}}/{{ns}}.json', // Development path
  },
};

void i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(Backend)
  .init<HttpBackendOptions>(i18nOptions);

export default i18n;
