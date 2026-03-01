import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enTranslation from './locales/en.json'
import taTranslation from './locales/ta.json'

const resources = {
    en: {
        translation: enTranslation,
    },
    ta: {
        translation: taTranslation,
    },
}

i18n.use(initReactI18next).init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false, // React already safe from XSS
    },
})

export default i18n
