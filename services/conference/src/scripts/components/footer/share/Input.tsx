import Button from '@material-ui/core/Button'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import React from 'react'
import {DialogPageProps} from './DialogPage'

interface InputProps<T> extends DialogPageProps{
  inputField: JSX.Element
  value: T
  onFinishInput: (text: T) => void
}

export function Input<T>(props: InputProps<T>) {  // tslint: disable-line
  const {
    setStep,
    value,
    onFinishInput,
    inputField,
  } = props

  return (
    <List>
      <ListItem>
        {inputField}
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
Input.displayName = 'Input'
