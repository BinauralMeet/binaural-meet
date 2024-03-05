// google oauth
// use axios
import { useGoogleLogin } from "@react-oauth/google";
import {conference} from '@models/conference'
import errorInfo from "@stores/ErrorInfo";
import axios from 'axios';
import React, { useState, useEffect } from "react";
import {ErrorDialogFrame} from './error/ErrorDialog'
import {buttonStyle, dialogStyle} from '@components/utils'
import DialogContent from '@material-ui/core/DialogContent'
import Button from '@material-ui/core/Button'
import {t} from '@models/locales'

export interface GoogleAuthComponentLoginProps {
  doGoogleAuth: boolean;
  room: string;
}

export const GoogleAuthComponentLogin: React.FC<GoogleAuthComponentLoginProps> = (props: GoogleAuthComponentLoginProps) => {
  const [doGoogleAuth, setDoGoogleAuth] = useState(false);

  useEffect(() => {
    console.log("useEffect")
    setDoGoogleAuth(props.doGoogleAuth)
    console.log(props.doGoogleAuth)
    console.log(doGoogleAuth)
    if (props.doGoogleAuth) {
      setDoGoogleAuth(false)
      sessionStorage.setItem("googleAuth", "true")
      login()
    }
  }, [props.doGoogleAuth])

  // Room Auth and Enter
  // Google Aauth2 Login AND Get User Info
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("onSuccess: " + tokenResponse.access_token);
      console.log(tokenResponse);
      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer ' + tokenResponse.access_token } },
      )
      console.log(userInfo.data);
      console.log(userInfo.data.email);
      // second time use conference.auth to check if the mail address match the room mail address list
      console.log("second conference.auth")
      conference.auth(props.room, true, userInfo.data.email).then((result) => {
        if(result == "success") {
          conference.enter(props.room, true).then((result) => {
            // hide dialog and clear error
            errorInfo.type = ''
          });
        }
        else{
          // when the result is not success, it will show the error message in the dialog
          // TODO: show error message
          console.log("auth failed, your email is not in the list of the room's email list. Please contact the room owner to add your email to the list.")
          errorInfo.type = 'noEnterPremission'

        }
      });
    },
    onNonOAuthError: errorResponse => {
    },
    onError: errorResponse => {
    }
  })

  const onClose = (ev:{}) => {
    const evKey = ev as React.KeyboardEvent
    if (evKey.code){
      //  console.log(`onClose code=${evKey.code}`)
      evKey.preventDefault()
      evKey.stopPropagation()
    }
    errorInfo.clear()
  }
  return(<></>)
  // return (
  // <ErrorDialogFrame style={dialogStyle} onClose={onClose}>
  //   <DialogContent>
  //     <Button color="primary" variant="contained" style={buttonStyle} autoFocus={true}
  //       onKeyDown={onClose} onClick={onClose}>
  //       {'Google Auth fail'}
  //     </Button>
  //     </DialogContent>
  // </ErrorDialogFrame>);

}
