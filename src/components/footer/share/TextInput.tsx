import TextField from '@material-ui/core/TextField'
import React, {useState} from 'react'
import {DialogPageProps} from './DialogPage'
import {Input} from './Input'

interface TextInputProps extends DialogPageProps{
  onFinishInput: (text: string) => void
  textLabel?: string
  defaultValue?: string
  multiline?: boolean
}

export const TextInput: React.FC<TextInputProps> = (props) => {
  const {
    textLabel,
    defaultValue,
    ...remainProps
  } = props
  const {setStep, onFinishInput} = props
  const [value, setValue] = useState<string>(defaultValue === undefined ? '' : defaultValue)
  const field = (
    <TextField  label={textLabel} multiline={props.multiline} value={value}
        onChange={event => setValue(event.target.value)}
        fullWidth={true} inputProps={{autoFocus:true}}
        onKeyPress={(ev)=>{
          if (!props.multiline && ev.key === 'Enter'){
            onFinishInput(value)
            setStep('none')
          }
        }}
    />
  )

  return (
    <Input value={value} inputField={field} {...remainProps}/>
  )
}
TextInput.displayName = 'TextInput'
