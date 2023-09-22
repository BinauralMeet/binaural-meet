import {Stores} from '@components/utils'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import Popover from '@material-ui/core/Popover'
import TextField from '@material-ui/core/TextField'
import {conference} from '@models/conference'
import {MessageType} from '@models/conference/DataMessageType'
import {isDarkColor, rgb2Color} from '@models/utils'
import {RoomInfo} from '@stores/RoomInfo'
import contents from '@stores/sharedContents/SharedContents'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {SketchPicker} from 'react-color'
import {RemoteTrackLimitControl} from './RemoteTrackLimitControl'
import { PositionServerForm } from './PositionServerForm'
import { useState } from 'react'
import CrownIcon from '../../../images/crown.png'

export interface AdminConfigFormProps{
  close?: () => void,
  stores: Stores,
}
function onKeyPress(ev:React.KeyboardEvent, roomInfo: RoomInfo){
  if (ev.key === 'Enter') {
    let pass = roomInfo.roomProps.get('password')
    roomInfo.passMatched = roomInfo.password === (pass ? pass : '')
  }
}
export const AdminConfigForm: React.FC<AdminConfigFormProps> = (props: AdminConfigFormProps) => {
  const [clearName, setClearName] = React.useState('')
  const [showFillPicker, setShowFillPicker] = React.useState(false)
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const fillButton = React.useRef<HTMLButtonElement>(null)
  const colorButton = React.useRef<HTMLButtonElement>(null)
  const {roomInfo} = props.stores

  const [showPosition, setShowPosition] = React.useState(false)
  const anchor = React.useRef<HTMLDivElement>(null)
  function closePosition(){
    setShowPosition(false)
  }

  //Google OAuth
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

  interface AuthResult {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    error?: string;
    id?: string; // Assuming the user ID is available as "id" within authResult
  }

  const [userGoogleID, setuserGoogleID] = useState()
  const currentUserId = "";
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
      setuserGoogleID(userId);
      console.log('User ID:', userId);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }

  return <Observer>{()=>{
    const textForFill = isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black'
    const textForColor = isDarkColor(roomInfo.backgroundColor) ? 'white' : 'black'
    const btnColor = roomInfo.passMatched ? 'primary' : 'default'

    return  <Box m={2}>
      <Box m={2}>
        <RemoteTrackLimitControl key="remotelimitcontrol" {...props.stores}/>
        <div ref={anchor} />
      </Box>

      <Box m={2}>
        <Button variant="contained" color={btnColor} style={{ textTransform: 'none' }} onClick={() => {
            authGoogleDrive();
            if (roomInfo.passMatched) { conference.dataConnection.sendMessage('dataConnect', {userId: userGoogleID}) }
          }}
        >
           Become Admin
        </Button>
      </Box>

      <Box mt={2} mb={2}>
        <TextField autoFocus label="Admin password" type="password" style={{marginTop:-12}}
          value={roomInfo?.password} onChange={(ev)=>{ roomInfo.password=ev.currentTarget.value}}
          onKeyPress={(ev)=>onKeyPress(ev, roomInfo)}/>
        &emsp;
        <Button variant="contained" color="primary" style={{textTransform:'none'}} onClick={() => {
          let pass = roomInfo.roomProps.get('password')
          if (!pass){ pass = '' }
          roomInfo.passMatched = roomInfo?.password === pass
        }}> Check </Button>&emsp;
        {roomInfo.passMatched ? 'OK': 'Not matched'}
        <span style={{backgroundColor:'rgba(0,0,0,0.1)', color:'white', position:'absolute', right:'1.5em',}} onClick={()=>{
          setShowPosition(true)
        }}>&nbsp;LPS&nbsp;</span>
      </Box>
      <Box mt={2} mb={2}>
        <TextField label="New password to update" type="text" style={{marginTop:-12}}
          value={roomInfo?.newPassword} onChange={(ev)=>{roomInfo.newPassword=ev.currentTarget.value}}
        />&emsp;
        <Button variant="contained" color={btnColor} disabled={!roomInfo.passMatched} style={{textTransform:'none'}}
          onClick={() => {
            if (roomInfo.passMatched){
              conference.dataConnection.setRoomProp('password', roomInfo.newPassword)
            }
          }}> Update password </Button>&emsp;
      </Box>
      <Box mt={2}>
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) { conference.dataConnection.sendMessage(MessageType.MUTE_VIDEO, true) }
        }}> Mute all videos </Button> &nbsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) { conference.dataConnection.sendMessage(MessageType.MUTE_VIDEO, false) }
        }}> Show all videos </Button>&emsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) { conference.dataConnection.sendMessage(MessageType.MUTE_AUDIO, true) }
        }}> Mute all mics </Button>&nbsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) { conference.dataConnection.sendMessage(MessageType.MUTE_AUDIO, false) }
        }}> Switch on all mics </Button>
      </Box>
      <Box mt={2}>
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) {
            contents.removeAllContents()
          }
        }}> Remove all Contents </Button>&emsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
            if (roomInfo.passMatched){
              const ids = new Set(contents.roomContentsInfo.keys())
              contents.all.forEach(c => ids.add(c.id))
              contents.all.filter(c => c.ownerName === clearName).forEach(c => contents.removeByLocal(c.id))
            }
        }}> Clear contents by user name </Button> &thinsp;
        <TextField label="name" type="text" style={{marginTop:-12}}
            value={clearName} onChange={(ev)=>{setClearName(ev.currentTarget.value)}} />
      </Box>
      <Box mt={2}>
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) {
            if (conference.isDataConnected()){
              conference.dataConnection.sendMessage(MessageType.RELOAD_BROWSER, {})
            }
          }
        }}> Reload </Button>&emsp;

        <Button variant="contained" disabled={!roomInfo.passMatched}
          style={roomInfo.passMatched ?
            {backgroundColor:rgb2Color(roomInfo.backgroundFill), color:textForFill, textTransform:'none'}
            : {textTransform:'none'} }
          onClick={()=>{if (roomInfo.passMatched){ setShowFillPicker(true) }}} ref={fillButton}>
          Back color</Button>
        <Popover open={showFillPicker}
          onClose={()=>{
            setShowFillPicker(false)
            conference.dataConnection.setRoomProp('backgroundFill', JSON.stringify(roomInfo.backgroundFill))
          }}
          anchorEl={fillButton.current} anchorOrigin={{vertical:'bottom', horizontal:'right'}}>
          <SketchPicker color = {{r:roomInfo.backgroundFill[0], g:roomInfo.backgroundFill[1],
            b:roomInfo.backgroundFill[2]}} disableAlpha
            onChange={(color, event)=>{
              event.preventDefault()
              roomInfo.backgroundFill = [color.rgb.r, color.rgb.g, color.rgb.b]
            }}
          />
        </Popover>
        &nbsp;
        <Button variant="contained" disabled={!roomInfo.passMatched}
          style={roomInfo.passMatched ?
            {backgroundColor:rgb2Color(roomInfo.backgroundColor), color:textForColor, textTransform:'none'}
            : {textTransform:'none'} }
          onClick={()=>{if (roomInfo.passMatched){ setShowColorPicker(true)} }} ref={colorButton}>
          Pattern color</Button>
        <Popover open={showColorPicker}
          onClose={()=>{
            setShowColorPicker(false)
            conference.dataConnection.setRoomProp('backgroundColor', JSON.stringify(roomInfo.backgroundColor))
          }}
          anchorEl={colorButton.current} anchorOrigin={{vertical:'bottom', horizontal:'right'}}>
          <SketchPicker color = {{r:roomInfo.backgroundColor[0], g:roomInfo.backgroundColor[1],
            b:roomInfo.backgroundColor[2]}} disableAlpha
            onChange={(color, event)=>{
              event.preventDefault()
              roomInfo.backgroundColor = [color.rgb.r, color.rgb.g, color.rgb.b]
            }}
          />
        </Popover>&nbsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.passMatched} onClick={() => {
          if (roomInfo.passMatched) {
            roomInfo.backgroundFill = roomInfo.defaultBackgroundFill
            roomInfo.backgroundColor = roomInfo.defaultBackgroundColor
            conference.dataConnection.setRoomProp('backgroundFill', JSON.stringify(roomInfo.backgroundFill))
            conference.dataConnection.setRoomProp('backgroundColor', JSON.stringify(roomInfo.backgroundColor))
          }
        }}> Default </Button>&emsp;
      </Box>
      {showPosition ? <Popover open={showPosition} onClose={closePosition} anchorEl={anchor.current}>
        <PositionServerForm stores={props.stores} close={closePosition}/>
      </Popover> : undefined}

    </Box>}
  }</Observer>
}
