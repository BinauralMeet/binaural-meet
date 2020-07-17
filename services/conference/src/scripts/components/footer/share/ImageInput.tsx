import {DropzoneArea} from 'material-ui-dropzone'
import React, {useState} from 'react'
import {DialogPageProps} from './DialogPage'
import {Input} from './Input'

interface ImageInputProps extends DialogPageProps{
}

export const ImageInput: React.FC<ImageInputProps> = (props) => {
  const {
    setStep,
  } = props

  const [files, setFiles] = useState<File[]>([])

  const field = (
    <DropzoneArea
      acceptedFiles={['image/*']}
      filesLimit={1}
      dropzoneText="Drag and drop an image here or click"
      onChange={setFiles}
    />
  )

  return (
    <Input
      setStep={setStep}
      onFinishInput={(files) => {
        console.debug(`Share image files: ${files}`)
        // TODO modify store
      }}
      value={files}
      inputField={field} />
  )
}
