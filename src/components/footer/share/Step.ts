import {BMProps} from '@components/utils'

export type Step = 'menu' | 'none' | 'text' | 'iframe' | 'image' | 'whiteboard' | 'camera'| 'Gdrive'

export interface DialogPageProps extends BMProps {
  setStep: (step: Step) => void
}
