import React, { useEffect } from 'react'
import {DialogPageProps} from './Step'


interface GoogleDriveImportProps extends DialogPageProps{
  onSelectedFile: (text: string) => void
}

export const GoogleDriveImport: React.FC<GoogleDriveImportProps> = ({ onSelectedFile }) => {
  // The Browser API key obtained from the Google API Console.
  // Replace with your own Browser API key, or your own key.
  const developerKey = 'AIzaSyAADCXxUujmh0VqXIzJofwl03MA5O8v8EQ'

  // The Client ID obtained from the Google API Console. Replace with your own Client ID.
  //const clientId = "858773398697-vki2lito392c5dlss9s31ap077nn0qbd.apps.googleusercontent.com"
  const clientId = "188672642721-3f8u1671ecugbl2ukhjmb18nv283upm0.apps.googleusercontent.com"

  // Replace with your own project number from console.developers.google.com.
  // See "Project number" under "IAM & Admin" > "Settings"
  //const appId = "binarual-meet"
  const appId = "188672642721"

  // Scope to use to access user's Drive items.
  const scope = ['https://www.googleapis.com/auth/drive.file']

  let pickerApiLoaded = false
  let oauthToken: undefined | string

  // Create and render a Picker object for searching images.
  function createPicker(oauthToken:string) {
    if (pickerApiLoaded && oauthToken) {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS) // LIMIT CONTENT TYPE RESULT
      //view.setMimeTypes("image/png,image/jpeg,image/jpg"); // LIMIT BY MIME TYPE
      const picker = new google.picker.PickerBuilder()
          .enableFeature(google.picker.Feature.NAV_HIDDEN)
          // .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
          .setAppId(appId)
          .setOAuthToken(oauthToken)
          .addView(view)
          .addView(new google.picker.DocsUploadView())
          .setDeveloperKey(developerKey)
          .setCallback(pickerCallback)
          .build()
        picker.setVisible(true)
    }
  }

  // A simple callback implementation.
  function pickerCallback(data:any) {
    if (data.action === google.picker.Action.PICKED) {
      const fileId = data.docs[0].id
      //TODO: if wanted change permissiosn to public but his could be a security issue
      //insertPermission(fileId,undefined,'anyone', 'reader')
      onSelectedFile(data.docs[0].embedUrl)
    }
  }

    /**
   * Insert a new permission.
   *
   * @param {String} fileId ID of the file to insert permission for.
   * @param {String} value User or group e-mail address, domain name or
   *                       {@code null} "default" type.
   * @param {String} type The value "user", "group", "domain" or "default".
   * @param {String} role The value "owner", "writer" or "reader".
   */
  function insertPermission(fileId:string, value:string | undefined, type:string, role:'owner' | 'writer' | 'reader') {
    var body = { value, type, role}
    if(gapi.client.drive){
      var request = gapi.client.drive.permissions.create({
        fileId,
        'resource': body
      })
      request.execute(function(resp:any) { console.log({resp}) })
    }else{
      gapi.client.load('drive','v3').then(()=>insertPermission(fileId,value,type,role))
    }
  }


  useEffect(() => {
    if(gapi && window.gapiPickerReady ){
      const token = sessionStorage.getItem('gdriveToken')
      if(token)
      createPicker(token)
    }
  }, [gapi,window.gapiPickerReady])

  return <>{'loading...'}</>
}
GoogleDriveImport.displayName = 'GoogleDriveImport'


