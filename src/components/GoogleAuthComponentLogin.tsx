// google oauth
// use axios
import { useGoogleLogin } from "@react-oauth/google";
import {conference} from '@models/conference'
import errorInfo from "@stores/ErrorInfo";
import axios from 'axios';
import React, { useState, useEffect } from "react";


export interface GoogleAuthComponentLoginProps {
  doGoogleAuth: boolean;
  room: string;
  onTokenReceived?: (token: string, role:string, email: string) => void;
}

export const GoogleAuthComponentLogin: React.FC<GoogleAuthComponentLoginProps> = (props: GoogleAuthComponentLoginProps) => {
  const [doGoogleAuth, setDoGoogleAuth] = useState(false);

  useEffect(() => {
    console.log("doGoogleAuth", props.doGoogleAuth)
    setDoGoogleAuth(props.doGoogleAuth)
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
      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer ' + tokenResponse.access_token } },
      )
      // second time call conference.auth to check if the user has the permission to enter the room
      conference.auth(props.room, true, userInfo.data.email).then((result) => {
        const role = result
        if(result == "guest") {
          conference.enter(props.room, true).then((result) => {
            // pass the token to local storage
            props.onTokenReceived && props.onTokenReceived(tokenResponse.access_token, role, userInfo.data.email);
            // hide dialog and clear error
            errorInfo.type = ''
          });
        }
        else if(result == "admin") {
          conference.enter(props.room, true).then((result) => {
            props.onTokenReceived && props.onTokenReceived(tokenResponse.access_token, role, userInfo.data.email);
            // save the admin info to server
            conference.saveAdmin(props.room, userInfo.data.email , tokenResponse.access_token).then((result) => {});
            // hide dialog and clear error
            errorInfo.type = ''
          });
        }
        else{
          // when the result is not success, it will show the error message in the dialog
          errorInfo.type = 'noEnterPremission'
        }
      });
    },
    onNonOAuthError: errorResponse => {
    },
    onError: errorResponse => {
    }
  })
  return(<></>)
}
