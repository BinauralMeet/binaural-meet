import {BMProps} from '@components/utils'
import {Step} from './Step'

export interface DialogPageProps extends BMProps {
  setStep: (step: Step) => void
}
