import { buttonStyle, dialogStyle, translateIconStyle } from "@components/utils";
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
import CircularProgress from "@material-ui/core/CircularProgress";
import { GoogleAuthLogin } from "@components/utils/GoogleAuthLogin";
import {participants} from '@stores/'

export const TheEntrance: React.FC = () => {
  const [name, setName] = useState(participants.local.information.name);
  const savedRoom = sessionStorage.getItem("room");
  const [room, setRoom] = useState(
    urlParameters.room ? urlParameters.room : savedRoom ? savedRoom : ""
  );
  const [doGoogleAuth, setDoGoogleAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onClose = (enter: boolean) => {
    if (!enter || name.length === 0) return
    setIsLoading(true);
    if (participants.local.information.name !== name) {
      participants.local.information.name = name
      //participants.local.sendInformation()
      participants.local.saveInformationToStorage(true)
    }
    urlParameters.room = room;
    sessionStorage.setItem("room", room)
    // room auth
    // the first conference.auth check if user need to use google auth.
    // If not, it will enter the room use conference.enter
    conference.preEnter(room).then(loginRequired => {
      //  console.log(`conference.preConnect: loginRequired=${loginRequired}`)
      if(loginRequired) {
        // do google auth, will call conference.auth again after google Oauth2
        setDoGoogleAuth(true)
      } else {
        participants.local.information.role = 'guest'
        // don't need google auth, enter the room without email
        conference.enter(room, undefined, undefined).then((result) => {
          errorInfo.clear()
          errorInfo.startToListenRtcTransports()
        }).catch(r=>{
          errorInfo.type = 'noEnterPremission'
        })
      }
    })
  };

  const onKeyDown = (ev: React.KeyboardEvent) => {
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
          onKeyDown={onKeyDown}
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
            onKeyDown={onKeyDown}
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

        <GoogleAuthLogin room={room} doAuth={doGoogleAuth} />

      </DialogContent>
    </ErrorDialogFrame>
  );
};
TheEntrance.displayName = "TheEntrance";
