export type Step = 'menu' | 'none' | 'text' | 'iframe' | 'image' | 'whiteboard' | 'camera'| 'Gdrive'

export interface DialogPageProps {
  setStep: (step: Step) => void
}
