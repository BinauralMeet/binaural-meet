export type Step = 'menu' | 'record' | 'none'

export interface DialogPageProps {
  setStep: (step: Step) => void
}
