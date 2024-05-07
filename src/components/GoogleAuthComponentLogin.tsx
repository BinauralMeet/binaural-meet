// google oauth
// use axios
import { useGoogleLogin } from "@react-oauth/google";
import {conference} from '@models/conference'
import errorInfo from "@stores/ErrorInfo";
import axios from 'axios';
import React, { useEffect } from "react";
import { connLog } from "@models/utils";


export interface GoogleAuthComponentLoginProps {
  doGoogleAuth: boolean;
  room: string;
}

// Room Auth and Enter
// Google Aauth2 Login AND Get User Info
export const GoogleAuthComponentLogin: React.FC<GoogleAuthComponentLoginProps> = (props: GoogleAuthComponentLoginProps) => {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      connLog()(`Auth onSuccess called.`)
      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer ' + tokenResponse.access_token } },
      )
      connLog()(`Auth userInfo: ${JSON.stringify(userInfo)}.`)
      // Second time call conference.auth to check if the user has the permission to enter the room
      conference.enter(props.room, tokenResponse.access_token, userInfo.data.email).then((result) => {
        connLog()(`GoogleAuth enter result = ${result}`)
        errorInfo.clear()
        errorInfo.startToListenRtcTransports()
      }).catch(e=>{
        connLog()(`GoogleAuth enter catch=${e}`)
        // when the result is not success, it will show the error message in the dialog
        errorInfo.type = 'noEnterPremission'
      })
    },
    onNonOAuthError: errorResponse => {
      errorInfo.type = 'noEnterPremission'
    },
    onError: errorResponse => {
      errorInfo.type = 'noEnterPremission'
    }
  })

  //const [doGoogleAuth, setDoGoogleAuth] = useState(false);
  useEffect(() => {
    //setDoGoogleAuth(props.doGoogleAuth)
    if (props.doGoogleAuth) {
      //setDoGoogleAuth(false)
      sessionStorage.setItem("googleAuth", "true")
      login()
    }
  }, [props.doGoogleAuth])
  return(<></>)
}
