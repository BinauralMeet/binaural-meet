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
import React, { useState, useEffect } from "react";
import { ErrorDialogFrame } from "./ErrorDialog";
import {tfDivStyle, tfIStyle, tfLStyle} from '@components/utils'
import {conference} from '@models/conference'
import {GoogleAuthComponentLogin as GoogleAuthComponent } from '../GoogleAuthComponentLogin';
import CircularProgress from "@material-ui/core/CircularProgress";
import { set } from "lodash";

export const TheEntrance: React.FC<BMProps> = (props) => {
  const { participants } = props.stores;
  const [name, setName] = useState(participants.local.information.name);
  const savedRoom = sessionStorage.getItem("room");
  const [room, setRoom] = useState(
    urlParameters.room ? urlParameters.room : savedRoom ? savedRoom : ""
  );
  const [doGoogleAuth, setDoGoogleAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    getRoomsList();
  }, []);

  const onClose = (save: boolean) => {
    setIsLoading(true);
    if (name.length !== 0 || participants.local.information.name.length !== 0){
      if (save || participants.local.information.name.length === 0) {
        if (name.length && participants.local.information.name !== name) {
          participants.local.information.name = name
          participants.local.sendInformation()
          participants.local.saveInformationToStorage(true)
        }
      }
      if (save){
        urlParameters.room = room;
        sessionStorage.setItem("room", room)
      }
      // room auth
      // the first conference.auth check if user need to use google auth. If not, it will enter the room use conference.enter
      conference.auth(room, false, '').then((result) => {
        if(result == "guest" || result == "admin") {
          // don't need google auth, enter the room without email
          conference.enter(room, false).then((result) => {
            errorInfo.type = ''
          })
        } else {
          // do google auth, will call conference.auth again after google Oauth2
          setDoGoogleAuth(true)
        }
      })
    }
  };

  //save the token and email to local storage and participants information
  const onTokenReceived = (token: string, role: string, email: string) => {
    participants.local.information.token = token
    participants.local.information.role = role
    participants.local.information.email = email
    participants.local.sendInformation()
    participants.local.saveInformationToStorage(true)
  };

  const onKeyPress = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter") {
      onClose(true);
    } else if (ev.key === "Esc" || ev.key === "Escape") {
      onClose(false);
    }
  };

  const getRoomsList = async () => {

    conference.getRoomList().then((result) => {
      // get success
    }).catch((error) => {
      console.error("download json file error", error);
      errorInfo.type = 'roomInfo'
    });
  };

  const { t, i18n } = useTranslation();

  return (
    <ErrorDialogFrame
      onClose={() => { onClose(false) }}
    >
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
        <Box display="flex" mt={4}>
          <Button
            variant="contained"
            color="primary"
            disabled={name.length===0}
            onClick={() => onClose(true)}
            style={buttonStyle}
          >
            {t("EnterTheVenue")}
          </Button>
        {isLoading && <CircularProgress style={{ color: 'blue', marginTop: '1%', marginLeft: '2%' }}/>}
        </Box>

        <GoogleAuthComponent room={room} doGoogleAuth={doGoogleAuth} onTokenReceived={onTokenReceived} ></GoogleAuthComponent>

      </DialogContent>
    </ErrorDialogFrame>
  );
};
TheEntrance.displayName = "TheEntrance";
