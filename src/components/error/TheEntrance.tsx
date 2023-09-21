import { BMProps, buttonStyle, dialogStyle, translateIconStyle } from "@components/utils";
import usageEn from "@images/usage.en.png";
import usageJa from "@images/usage.ja.png";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import TextField from "@material-ui/core/TextField";
import TranslateIcon from "@material-ui/icons/Translate";
import { i18nSupportedLngs, useTranslation } from "@models/locales";
import { urlParameters } from "@models/url";
import { isPortrait, isSmartphone } from "@models/utils";
import errorInfo from "@stores/ErrorInfo";
import React, { useState } from "react";
import { ErrorDialogFrame } from "./ErrorDialog";
import {tfDivStyle, tfIStyle, tfLStyle} from '@components/utils'

export const TheEntrance: React.FC<BMProps> = (props) => {
  const { participants } = props.stores;
  const [name, setName] = useState(participants.local.information.name);
  const savedRoom = sessionStorage.getItem("room");
  const [room, setRoom] = useState(
    urlParameters.room ? urlParameters.room : savedRoom ? savedRoom : ""
  );

  const onClose = async (save: boolean) => {
    if (name.length !== 0 || participants.local.information.name.length !== 0) {
      if (save || participants.local.information.name.length === 0) {
        if (name.length && participants.local.information.name !== name) {
          participants.local.information.name = name;
          participants.local.sendInformation();
          participants.local.saveInformationToStorage(true);
        }
      }
      if (save) {
        urlParameters.room = room;
        sessionStorage.setItem("room", room);
        try {
          // Call Google Drive authentication here and await its completion
          await authGoogleDrive();
          errorInfo.clear();
        } catch (error) {
          console.error('An error occurred:', error);
        }
      }
      //errorInfo.clear();
    }
  };


  const onKeyPress = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter") {
      onClose(true);
    } else if (ev.key === "Esc" || ev.key === "Escape") {
      onClose(false);
    }
  };

  const { t, i18n } = useTranslation();


  interface AuthResult {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    error?: string;
    id?: string; // Assuming the user ID is available as "id" within authResult
  }

  const authGoogleDrive = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      (window as any).authorizeGdrive(async (authResult: AuthResult) => {
        if (authResult && !authResult.error) {

          console.log("Access token ", authResult);

          // Access token
          if (authResult.access_token) {
            const oauthToken = authResult.access_token;
            sessionStorage.setItem('gdriveToken', oauthToken);

            // Using getUserInfo function
            try {
              await getUserInfo(oauthToken);  // Now it's using await
            } catch (error) {
              console.error('Error fetching user info:', error);
              reject(new Error('Error fetching user info.'));
              return;
            }

          } else {
            console.error("No access token found.");
            reject(new Error('No access token found.'));
            return;
          }
          resolve();
        } else {
          reject(new Error('Authentication failed')); // Signal error
        }
      });
    });
  };


  /*function getUserInfo(accessToken: any) {
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => response.json())
    .then(data => {
      const userId = data.sub;
      console.log('User ID:', userId);
    })
    .catch(error => {
      console.error('Error fetching user info:', error);
    });
  }*/

  async function getUserInfo(accessToken: any): Promise<void> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const userId = data.sub;
      console.log('User ID:', userId);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }




  return (
    <ErrorDialogFrame onClose={() => { onClose(false) }} disableBackdropClick={true}>
      <DialogContent style={dialogStyle}>
        <Button
          style={{ position: "absolute", top: 30, right: 20 }}
          onClick={() => {
            const idx =
              (i18nSupportedLngs.findIndex((l:any) => l === i18n.language) + 1) %
              i18nSupportedLngs.length;
            i18n.changeLanguage(i18nSupportedLngs[idx]);
          }}
        >
          <TranslateIcon style={translateIconStyle}/>
        </Button>
        <h2>Binaural Meet</h2>
        <p>
          <img
            style={{ float: "right", width: isSmartphone()&&isPortrait() ? "14em" : "28em" }}
            src={i18n.language === "ja" ? usageJa : usageEn}
            alt="usage"
          />
          {t("enAbout")}&nbsp;
          <a href={t("enTopPageUrl")}>{t("enMoreInfo")}</a>
        </p>
        <br />
        <TextField
          label={t("YourName")}
          multiline={false}
          value={name}
          style={tfDivStyle}
          inputProps={{ style: tfIStyle, autoFocus: true }}
          InputLabelProps={{ style: tfLStyle }}
          onChange={(event) => setName(event.target.value)}
          onKeyPress={onKeyPress}
          fullWidth={true}
        />
        <Box mt={4}>
          <TextField
            label={t("Venue")}
            multiline={false}
            value={room}
            style={tfDivStyle}
            inputProps={{ style: tfIStyle, autoFocus: false }}
            InputLabelProps={{ style: tfLStyle }}
            onChange={(event) => setRoom(event.target.value)}
            onKeyPress={onKeyPress}
            fullWidth={true}
          />
        </Box>
        <Box mt={4}>
          <Button
            variant="contained"
            color="primary"
            disabled={name.length===0}
            onClick={() => onClose(true)}
            style={buttonStyle}
          >
            {t("EnterTheVenue")}
          </Button>
        </Box>
      </DialogContent>
    </ErrorDialogFrame>
  );
};
TheEntrance.displayName = "TheEntrance";
