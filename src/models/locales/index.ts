import i18n, {TOptions} from 'i18next'
import i18nLanguageDetector from 'i18next-browser-languagedetector'
import {initReactI18next, useTranslation as useTrans} from 'react-i18next'
import {EnKeyList, enTranslate} from './en'
import {JaKeyList, jaTranslate} from './ja'

export type KeyList = EnKeyList & JaKeyList
export function t(key: KeyList, options?:string | TOptions) {
  return i18n.t(key, options)
}
export interface UseTranslationResponse{
  t:(key: KeyList) => string
  i18n: typeof i18n
  ready: boolean
}
export function useTranslation():UseTranslationResponse {
  const res = useTrans()

  return res as UseTranslationResponse
}

const resources = {
  en: {translation: enTranslate},
  ja: {translation: jaTranslate},
}
export const i18nSupportedLngs = Object.keys(resources)
export const i18nOptions = {
  resources,
  supportedLngs:i18nSupportedLngs,
  fallbackLng: i18nSupportedLngs[0],
  interpolation: {escapeValue: false},
}
export function i18nInit() {
  return i18n.use(initReactI18next).use(i18nLanguageDetector).init(i18nOptions)
}
