import {BMProps} from '@components/utils'
import Container from '@material-ui/core/Container'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import {useTranslation} from '@models/locales'
import {Observer} from 'mobx-react-lite'
import React from 'react'

export const FaceControl: React.FC<BMProps> = (props: BMProps) => {
  const local = props.stores.participants.local
  const faceSwitch = <Observer>{ () =>
    <Switch checked={local.information.faceTrack} name="face"
      onChange={event => {
        local.information.faceTrack = !local.information.faceTrack
        local.saveInformationToStorage(true)
        local.sendInformation()
      } } />
  }</Observer>
  const {t} = useTranslation()

  return <Container>
    <FormControlLabel
      control={faceSwitch}
      label={t('showTrackedFace')}
    />
  </Container>
}
FaceControl.displayName = 'FaceControl'
