import { BMProps, buttonStyle, dialogStyle, translateIconStyle } from "@components/utils";
import usageEn from "@images/usage.en.png";
import usageJa from "@images/usage.ja.png";
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Checkbox from "@material-ui/core/Checkbox";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import TextField from "@material-ui/core/TextField";
import TranslateIcon from "@material-ui/icons/Translate";
import { i18nSupportedLngs, useTranslation } from "@models/locales";
import { urlParameters } from "@models/url";
import { isPortrait, isSmartphone } from "@models/utils";
import errorInfo from "@stores/ErrorInfo";
import React, { useState } from "react";
import { ErrorDialogFrame } from "./ErrorDialog";
import { tfDivStyle, tfIStyle, tfLStyle } from '@components/utils'

import JoinVenueModal from './JoinVenueModal';
import CreateVenueModal from './CreateVenueModal';
import { fetchRoomById } from '../../models/conference/roomServices';

// Define your styles
const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    color: '#000',
    textAlign: 'center',
    borderRadius: '20px',
    padding: '30px 30px 70px',
    width: '320px',
  },
  closeBtn: {
    width: '30px',
    fontSize: '20px',
    color: '#c0c5cb',
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    border: 'none',
    marginBottom: '10px',
  },
  acceptBtn: {
    backgroundColor: '#ed6755',
    border: 'none',
    borderRadius: '5px',
    width: '200px',
    padding: '14px',
    fontSize: '16px',
    color: 'white',
    boxShadow: '0px 6px 18px -5px rgba(237, 103, 85, 1)',
  }
}));

export const TheEntrance: React.FC<BMProps> = (props) => {
  // Call to useStyles
  const classes = useStyles();

  const { participants } = props.stores;
  const [name, setName] = useState(participants.local.information.name);
  const savedRoom = sessionStorage.getItem("room");
  const [room, setRoom] = useState(
    urlParameters.room ? urlParameters.room : savedRoom ? savedRoom : ""
  );

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isRequiredPassword, setIsRequiredPassword] = useState(false);
  const [password, setPassword] = useState("");

  // Join Modal Component
  const handleOpenJoinDialog = () => {
      setJoinDialogOpen(true);
  };

  const handleCloseJoinDialog = async () => {
    setJoinDialogOpen(false);

    const roomId = 'ConferensceRoom1';

    try {
      const roomFetched = await fetchRoomById(roomId);
      //console.log("Room Found: ", roomFetched);

      if (Object.keys(roomFetched).length === 0) {
        console.log("The room doesn't exist.");
      } else {
        console.log("Room Founded:", roomFetched);
      }
    } catch (error) {
      console.log('Error:', error);
    }
  };



  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handlePasswordCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsRequiredPassword(event.target.checked);
  };

  /*const onKeyPress = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter") {
      handleCloseJoinDialog();
      handleCloseCreateDialog();
    } else if (ev.key === "Esc" || ev.key === "Escape") {
      handleCloseJoinDialog();
      handleCloseCreateDialog();
    }
  };*/

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
      errorInfo.clear()
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
    <ErrorDialogFrame onClose={() => { handleCloseJoinDialog(); handleCloseCreateDialog(); onClose(false);}}>

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


            <Box mt={4} display="flex" justifyContent="center" alignItems="center">
              <Button
                variant="contained"
                color="primary"
                disabled={name.length === 0}
                onClick={() => handleOpenJoinDialog()}
                style={{ ...buttonStyle, margin: '22px' }}
              >
                {t("JoinVenue")}
              </Button>

              <Button
                variant="contained"
                color="primary"
                disabled={name.length === 0}
                onClick={() => handleOpenCreateDialog()}
                style={{ ...buttonStyle, margin: '22px' }}
              >
                {t("CreateVenue")}
              </Button>
            </Box>

    </DialogContent>

    {/* Join Venue Modal */}
    <JoinVenueModal open={joinDialogOpen} onClose={handleCloseJoinDialog} />

    {/* Join Venue Modal */}
    <CreateVenueModal open={createDialogOpen} onClose={handleCloseCreateDialog} />

    </ErrorDialogFrame>
  );
};
TheEntrance.displayName = "TheEntrance";
