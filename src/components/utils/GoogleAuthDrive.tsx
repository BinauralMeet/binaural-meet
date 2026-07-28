import { useGoogleLogin } from "@react-oauth/google";
import { gDriveAuth } from "@stores/sharedContents/GDriveUtil";
import axios from 'axios';
import React, { useEffect } from "react";

export interface GoogleAuthLoginProps {
  doAuth: boolean;
}

// Google Aauth2 Login AND Get User Info
export const GoogleAuthDrive: React.FC<GoogleAuthLoginProps> = (props: GoogleAuthLoginProps) => {
  const login = useGoogleLogin({
    scope:'https://www.googleapis.com/auth/drive.file	',
    onSuccess: async (tokenResponse) => {
      //console.log(`Auth onSuccess called.`)
      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer ' + tokenResponse.access_token } },
      )
      // console.log(`GDrive Auth userInfo: ${JSON.stringify(userInfo)}.`)
      // Second time call conference.auth to check if the user has the permission to enter the room
      gDriveAuth.email = userInfo.data.email
      gDriveAuth.token = tokenResponse.access_token
    },
    onNonOAuthError: errorResponse => {
      //console.log(`non auth error.`)
    },
    onError: errorResponse => {
      //console.log(`auth error.`)
    }
  })

  useEffect(() => {
    if (props.doAuth) {
      login()
    }
  }, [props.doAuth])
  return(<></>)
}
