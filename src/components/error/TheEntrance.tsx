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
import {conference} from '@models/conference'
import {GoogleAuthComponentLogin as GoogleAuthComponent } from '../GoogleAuthComponentLogin';

export const TheEntrance: React.FC<BMProps> = (props) => {
  const { participants } = props.stores;
  const [name, setName] = useState(participants.local.information.name);
  const savedRoom = sessionStorage.getItem("room");
  const [room, setRoom] = useState(
    urlParameters.room ? urlParameters.room : savedRoom ? savedRoom : ""
  );
  const [doGoogleAuth, setDoGoogleAuth] = useState(false);
  const onClose = (save: boolean) => {
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
      conference.auth(room, false, '').then((result) => {
        if(result == "success") {
          conference.enter(room, false).then((result) => {
            errorInfo.type = ''
          })
        } else {
          // do google auth
          setDoGoogleAuth(true)
        }
      })
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
        <GoogleAuthComponent room={room} doGoogleAuth={doGoogleAuth}></GoogleAuthComponent>

      </DialogContent>
    </ErrorDialogFrame>
  );
};
TheEntrance.displayName = "TheEntrance";
