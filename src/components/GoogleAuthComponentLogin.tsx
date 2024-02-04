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
      console.log(tokenResponse);
      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer ' + tokenResponse.access_token } },
      )
      console.log(userInfo.data);
      console.log(userInfo.data.email);
      conference.auth(props.room, true, userInfo.data.email).then((result) => {
        if(result == "success") {
          conference.enter(props.room, true).then((result) => {
            // hide dialog and clear error
            errorInfo.type = ''
          });
        }
      });
    },
    onNonOAuthError: errorResponse => {
    },
    onError: errorResponse => {
    }
  })
  return (
    <></>
  )
}
