import {useTranslation} from '@models/locales'
import {createContentOfImage} from '@stores/sharedContents/SharedContentCreator'
import sharedContents from '@stores/sharedContents/SharedContents'
import {DropzoneArea} from 'material-ui-dropzone'
import React, {useState} from 'react'
import {DialogPageProps} from './DialogPage'
import {Input} from './Input'
import Box from "@material-ui/core/Box";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";


interface ImageInputProps extends DialogPageProps{
}

export const ImageInput: React.FC<ImageInputProps> = (props) => {
  const {
    setStep,
  } = props

  const [files, setFiles] = useState<File[]>([])
  const [uploadType, setUploadType] = useState<"gyazo" | "gdrive">('gyazo')

  const {t} = useTranslation()
  const field = (
    <DropzoneArea
      acceptedFiles={['image/*']}
      dropzoneText={t('imageDropzoneText')}
      onChange={setFiles}
    />
  )

  const authGoogleDrive = ()=>{
    window.authorizeGdrive && window.authorizeGdrive((authResult: GoogleApiOAuth2TokenObject)=>{
      console.log(authResult);
      if (authResult && !authResult.error) {
        const oauthToken = authResult.access_token
        sessionStorage.setItem('gdriveToken',oauthToken)
      }
      else {
        setUploadType('gyazo')
        alert('Error authenticating Google Drive')
      }
    })
  }

  const map = props.stores.map

  return (
    <>
      <Box mt={0}>
        <FormControl component="fieldset">
          <FormLabel component="legend">File storage type:</FormLabel>
          <RadioGroup style={{display:"flex", flexDirection:"row"}}
            aria-label="upload-files-to"
            defaultValue="gyazo"
            value={uploadType}
            name="upload-files-to"
            onChange={(e) => {
              setUploadType(e.target.value as typeof uploadType);
              e.target.value === "gdrve" && authGoogleDrive();
            }}
          >
            <FormControlLabel value="gyazo" control={<Radio />} label="Gyazo" />
            <FormControlLabel
              value="gdrve"
              control={<Radio />}
              label="Google Drive"
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Input
        stores={props.stores}
        setStep={setStep}
        onFinishInput={(files) => {
          // TODO modify store
          files.forEach(async (file, i) => {
            const IMAGE_OFFSET_X = 30;
            const IMAGE_OFFSET_Y = -20;
            createContentOfImage(file, map, [
              IMAGE_OFFSET_X * i,
              IMAGE_OFFSET_Y * i,
            ], uploadType
            ).then((imageContent) =>
              sharedContents.shareContent(imageContent)
            );
          });
        }}
        value={files}
        inputField={field}
      />
    </>
  );
}
