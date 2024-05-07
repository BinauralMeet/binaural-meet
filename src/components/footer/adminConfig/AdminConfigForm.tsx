import {Stores} from '@components/utils'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import Popover from '@material-ui/core/Popover'
import TextField from '@material-ui/core/TextField'
import {conference} from '@models/conference'
import {MessageType} from '@models/conference/DataMessageType'
import {isDarkColor, rgb2Color} from '@models/utils'
import contents from '@stores/sharedContents/SharedContents'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {SketchPicker} from 'react-color'
import {RemoteTrackLimitControl} from './RemoteTrackLimitControl'
import { PositionServerForm } from './PositionServerForm'
import { urlParameters } from "@models/url";


export interface AdminConfigFormProps{
  close?: () => void,
  stores: Stores,
}
export const AdminConfigForm: React.FC<AdminConfigFormProps> = (props: AdminConfigFormProps) => {
  const [clearName, setClearName] = React.useState('')
  const [showFillPicker, setShowFillPicker] = React.useState(false)
  const [showColorPicker, setShowColorPicker] = React.useState(false)
  const fillButton = React.useRef<HTMLButtonElement>(null)
  const colorButton = React.useRef<HTMLButtonElement>(null)
  const {roomInfo,participants} = props.stores
  const [showPosition, setShowPosition] = React.useState(false)
  const anchor = React.useRef<HTMLDivElement>(null)
  const defaultTextLineHeight = {
    lineHeight:20,
    fontSize:16,
  }

  const textLineStyle = Object.assign({}, defaultTextLineHeight)

  function closePosition(){
    setShowPosition(false)
  }

  const onPrint = () => {
    console.log('admin buttom click')
    console.log(urlParameters.room)
    if(participants.local.information.role === 'guest'){
      console.log('admin buttom click: guest, you are not admin')
    }
    else{
      conference.checkAdmin().then((result:any) => {
        if(result === 'approve'){
        console.log("admin buttom click result: " + result)
          roomInfo.isAdmin = true
        }
        else{
          console.log("admin buttom click result: " + result)
        }
      });
    }
  };

  return <Observer>{()=>{
    const textForFill = isDarkColor(roomInfo.backgroundFill) ? 'white' : 'black'
    const textForColor = isDarkColor(roomInfo.backgroundColor) ? 'white' : 'black'
    const btnColor = roomInfo.isAdmin ? 'primary' : 'default'

    return <Box m={2}>
      <Box m={2}>
        <RemoteTrackLimitControl key="remotelimitcontrol" {...props.stores}/>
        <div ref={anchor} />
      </Box>
      <Box>
        <Button variant="contained" color={roomInfo.isAdmin ? 'primary': 'secondary'}
          style={{textTransform:'none'}}
          onClick = { () => {
            if (roomInfo.isAdmin){
              roomInfo.isAdmin = false
            }else{
              conference.checkAdmin().then((result)=>{
                console.log(`checkAdmin: ${result}`)
                if (result==='approve'){
                  roomInfo.isAdmin = true
                }
              })
            }
          }}
        >{roomInfo.isAdmin ? 'Leave admin' : 'Get admin'} </Button> &nbsp;
        <Button variant="contained" color={roomInfo.isAdmin ? 'primary' : 'default'}
          style={{textTransform:'none'}} disabled={!roomInfo.isAdmin}
          onClick = { () => {
            if (roomInfo.isAdmin){
              conference.dataConnection.sync.sendTrackLimits('', [participants.local.remoteVideoLimit, participants.local.remoteAudioLimit])
            }
          }}
        >Sync limits</Button> &nbsp;
        <Button
            variant="contained"
            color="primary"
            onClick={() => onPrint()}
            style={{textTransform:'none'}}
          >
          {"information test"}
        </Button> &nbsp;
        <span style={{backgroundColor:'rgba(0,0,0,0.1)', color:'white', position:'absolute', right:'1.5em',}} onClick={()=>{
          setShowPosition(true)
        }}>&nbsp;LPS&nbsp;</span>
      </Box>
      <Box mt={2}>
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) { conference.dataConnection.sendMessage(MessageType.MUTE_VIDEO, true) }
        }}> Mute all videos </Button> &nbsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) { conference.dataConnection.sendMessage(MessageType.MUTE_VIDEO, false) }
        }}> Show all videos </Button>&emsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) { conference.dataConnection.sendMessage(MessageType.MUTE_AUDIO, true) }
        }}> Mute all mics </Button>&nbsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) { conference.dataConnection.sendMessage(MessageType.MUTE_AUDIO, false) }
        }}> Switch on all mics </Button>
      </Box>
      <Box mt={2}>
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) {
            contents.removeAllContents()
          }
        }}> Remove all Contents </Button>&emsp;
        <Button variant="contained" color={btnColor} style={{textTransform:'none'}}
          disabled={!roomInfo.isAdmin} onClick={() => {
            if (roomInfo.isAdmin){
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
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) {
            if (conference.isDataConnected()){
              conference.dataConnection.sendMessage(MessageType.RELOAD_BROWSER, {})
            }
          }
        }}> Reload </Button>&emsp;

        <Button variant="contained" disabled={!roomInfo.isAdmin}
          style={roomInfo.isAdmin ?
            {backgroundColor:rgb2Color(roomInfo.backgroundFill), color:textForFill, textTransform:'none'}
            : {textTransform:'none'} }
          onClick={()=>{if (roomInfo.isAdmin){ setShowFillPicker(true) }}} ref={fillButton}>
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
        <Button variant="contained" disabled={!roomInfo.isAdmin}
          style={roomInfo.isAdmin ?
            {backgroundColor:rgb2Color(roomInfo.backgroundColor), color:textForColor, textTransform:'none'}
            : {textTransform:'none'} }
          onClick={()=>{if (roomInfo.isAdmin){ setShowColorPicker(true)} }} ref={colorButton}>
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
          disabled={!roomInfo.isAdmin} onClick={() => {
          if (roomInfo.isAdmin) {
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
