//  Footer control for subtitles. Two different things live behind it, and the split is the point:
//  the button itself is *my* view (show subtitles or not, and in which language), while the menu
//  carries the room's own switch -- whether anything is transcribed at all, which is everyone's.
import {FabWithTooltip} from '@components/utils/FabEx'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import ListSubheader from '@material-ui/core/ListSubheader'
import Switch from '@material-ui/core/Switch'
import SubtitlesIcon from '@material-ui/icons/Subtitles'
import SubtitlesOffIcon from '@material-ui/icons/SpeakerNotesOff'
import {conference} from '@models/conference'
import {t, useTranslation} from '@models/locales'
import {sttClient} from '@models/stt/SttClient'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {roomInfo, settings} from '@stores/'

//  Kept short on purpose: these are the languages the recognizer and the translator are actually
//  expected to handle here. 'auto' lets the recognizer decide; '' means "show me the original".
const SPEAK_LANGS = ['auto', 'ja', 'en', 'zh', 'ko']
const SHOW_LANGS = ['', 'ja', 'en', 'zh', 'ko']

export interface SttButtonProps{
  size?: number
  iconSize?: number
}

export const SttButton: React.FC<SttButtonProps> = (props) => {
  useTranslation()   //  re-render this button when the UI language changes
  const [menuEl, setMenuEl] = React.useState<Element|null>(null)

  return <Observer>{() => {
    const showing = settings.showSubtitles
    const roomOn = roomInfo.stt
    const error = sttClient.lastError
    //  Three states worth telling apart: nothing is being transcribed, it is but I am not
    //  looking, and it is and I am.
    const title = error ? t('sttUnavailable', {reason: error})
      : !roomOn ? t('ttSttRoomOff')
        : showing ? t('ttSttShown') : t('ttSttHidden')

    return <>
      <FabWithTooltip size={props.size} color={showing && roomOn ? 'secondary' : 'primary'}
        aria-label="stt" title={title}
        onClick={() => {
          settings.showSubtitles = !settings.showSubtitles
          settings.save()
        }}
        onClickMore={(ev) => { setMenuEl(ev.currentTarget) }}
      >
        {showing ? <SubtitlesIcon style={{width:props.iconSize, height:props.iconSize}} />
          : <SubtitlesOffIcon style={{width:props.iconSize, height:props.iconSize}} />}
      </FabWithTooltip>
      {menuEl ? <Menu anchorEl={menuEl} keepMounted={true} open={Boolean(menuEl)}
        onClose={() => setMenuEl(null)}>
        {/*  The room's switch, not this participant's: it starts transcribing everyone.  */}
        <MenuItem onClick={() => {
          conference.dataConnection.setRoomProp('stt', roomOn ? 'false' : 'true')
        }}>
          <Switch checked={roomOn} size="small" />
          {t('sttRoomSwitch')}
        </MenuItem>
        <ListSubheader>{t('sttSpeakLang')}</ListSubheader>
        {SPEAK_LANGS.map(lang => <MenuItem key={`speak-${lang}`}
          selected={settings.sttSpeak === lang}
          onClick={() => {
            settings.sttSpeak = lang
            settings.save()
            setMenuEl(null)
          }}>{lang === 'auto' ? t('sttLangAuto') : lang}</MenuItem>)}
        <ListSubheader>{t('sttShowLang')}</ListSubheader>
        {SHOW_LANGS.map(lang => <MenuItem key={`show-${lang}`}
          selected={settings.sttShow === lang}
          onClick={() => {
            settings.sttShow = lang
            settings.save()
            setMenuEl(null)
          }}>{lang === '' ? t('sttLangOriginal') : lang}</MenuItem>)}
      </Menu> : undefined}
    </>
  }}</Observer>
}
SttButton.displayName = 'SttButton'
