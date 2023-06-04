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
import Spinner from './LoadingScreen';

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

  const [isLoading, setIsLoading] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [warningText, setWarningText] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRequiredPassword, setIsRequiredPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [roomInfo, setRoomInfo] = useState({} as any);

  // Join Modal Component
  const handleOpenJoinDialog = () => {
      setJoinDialogOpen(true);
  };

  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
  };



  async function checkPassword(roomId: string, password: string): Promise<void> {
    const response = await fetch('http://localhost:3200/checkPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId, password }),
    });

    const result = await response.json();
    console.log('Result:', result);
    if (result.success) {
      console.log('Password is correct');
    } else {
      console.log('Password is incorrect');
    }
  }



  const fetchRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const roomFetched = await fetchRoomById(roomId);
      console.log("OBJ:", roomFetched);
      if (roomFetched && roomFetched.error && roomFetched.error === "Room not found") {
        setWarningText("The room doesn't exist.");
        setShowWarning(true);
      } else {
        console.log("Room Founded:", roomFetched);
        setRoomInfo(roomFetched);

        if (roomFetched.RoomPassword !== "") {
          if (password !== "" && password === roomFetched.RoomPassword) {
            setWarningText("Password is correct. Connecting");
            setShowWarning(true);
            onClose(true);
            handleCloseJoinDialog();
          }else if(password !== "" && password !== roomFetched.RoomPassword){
            setWarningText("Password is incorrect.");
            setShowWarning(true);
          }else{
            setWarningText("This Room requires a password.");
            setShowWarning(true);
            setShowPassword(true);
          }
        }else{
          onClose(true);
          setShowWarning(false);
          handleCloseJoinDialog();
        }
      }
    } catch (error) {
      console.log('Error:', error);
    }
    setIsLoading(false);
  };


  const handleSubmitJoinDialog = async () => {
    //const roomId = 'ConferenceRoom1';
    fetchRoom(room);

    /*checkPassword('demo', 'demo')
    .then(() => {
      // Handle success here
    })
    .catch((error) => {
      // Handle error here
      console.log("Can't connect to the Room");
      console.error(error);
    });*/
  };

  const handleSubmitCreateDialog = async () => {

    createRoom(room, room, "Miguel", password, false);

    /*if (roomInfo.RoomName === room) {
      setWarningText("The room already exists.");
      setShowWarning(true);
    }*/

    //createRoom(room, room, name, password, false);
  };

  async function createRoom(roomId: string, roomName: string, roomOwner: string, roomPassword: string, requiredLogin: boolean) {
    setIsLoading(true);
    const roomFetched = await fetchRoomById(roomId);
    if (roomFetched.RoomName === roomName) {
      setWarningText("The room already exist.");
      setShowWarning(true);
      console.log("Room Founded:", roomFetched);
    } else {
      setShowWarning(false);
      const response = await fetch('http://localhost:3200/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: roomId,
          RoomName: roomName,
          RoomOwner: roomOwner,
          RoomPassword: roomPassword,
          requiredLogin: requiredLogin,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }else{
        const room = await response.json();
        console.log('Room created:', room);
        onClose(true);
      }
    }

    setIsLoading(false);
  }

















  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  const handlePasswordCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsRequiredPassword(event.target.checked);
  };

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
    <ErrorDialogFrame onClose={() => {onClose(false);}}>

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
              //onKeyPress={onKeyPress}
              fullWidth={true}
            />
            {/*
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
            */}


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

    <Spinner isVisible={isLoading}/>

    {/* Join Venue Modal */}
    <JoinVenueModal key={warningText} open={joinDialogOpen}
      onClose={handleCloseJoinDialog}
      onSubmit={handleSubmitJoinDialog}
      showWarning={showWarning}
      warningText={warningText}
      showPassword={showPassword}
      room={room}
      setRoom={setRoom}
      password={password}
      setPassword={setPassword}/>

    {/* Join Venue Modal */}
    <CreateVenueModal
      //key={warningText}
      open={createDialogOpen}
      onClose={handleCloseCreateDialog}
      onSubmit={handleSubmitCreateDialog}
      showWarning={showWarning}
      warningText={warningText}
      showPassword={showPassword}
      room={room}
      setRoom={setRoom}
      password={password}
      setPassword={setPassword} />

    </ErrorDialogFrame>
  );
};
TheEntrance.displayName = "TheEntrance";
