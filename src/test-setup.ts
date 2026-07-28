import '@testing-library/jest-dom/vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// The codebase uses global `d` and `config` variables declared in index.html.
// Workaround: assign them to globalThis before any store imports.
// Using Object.assign to avoid SWC treating 'd' as a local variable.
Object.assign(globalThis, {
  d: {},
  config: {
    corsProxyUrl: 'https://binaural.me/cors/',
    avatar: 'frog',
    thirdPersonView: false,
    soundLocalizationBase: 'avatar',
    avatarDisplay2_5D: false,
    avatarDisplay3D: true,
    viewRotateByFace: false,
    uploaderPreference: 'gyazo',
    remoteVideoLimit: -1,
    remoteAudioLimit: -1,
  },
})

// Initialize i18next so translation lookups return the key itself.
i18n.use(initReactI18next).init({
  lng: 'cimode',
  resources: {},
})
