import Button from '@material-ui/core/Button'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import TextField from '@material-ui/core/TextField'
import React, {useState} from 'react'
import {DialogPageProps} from './DialogPage'

interface TextInputProps extends DialogPageProps{
  onFinishInput: (text: string) => void
  textLabel?: string
  defaultValue?: string
}

export const TextInput: React.FC<TextInputProps> = (props) => {
  const {
    setStep,
    onFinishInput,
    textLabel,
    defaultValue,
  } = props

  const [value, setValue] = useState<string>(defaultValue === undefined ? '' : defaultValue)

  return (
    <List>
      <ListItem>
        <TextField
            label={textLabel}
            multiline={true}
            value={value}
            onChange={event => setValue(event.target.value)}
            fullWidth={true}
        />
      </ListItem>
      <ListItem>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            onFinishInput(value)
            setStep('none')
          }}
        >
          Done
        </Button>
      </ListItem>
    </List>
  )
}
TextInput.displayName = 'TextInput'
