import {BMProps} from '@components/utils'

export type Step = 'menu' | 'record' | 'none'

export interface DialogPageProps extends BMProps {
  setStep: (step: Step) => void
}
