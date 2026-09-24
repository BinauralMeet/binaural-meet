//  Footer control for speech-to-text: on/off, plus the two languages that matter -- what you
//  speak and what you want to read. Recognition and translation both happen on the server
//  (bm workspace doc: `stt-translation`).
import {FabWithTooltip} from '@components/utils/FabEx'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import ListSubheader from '@material-ui/core/ListSubheader'
import SubtitlesIcon from '@material-ui/icons/Subtitles'
import SubtitlesOffIcon from '@material-ui/icons/SpeakerNotesOff'
import {t, useTranslation} from '@models/locales'
import {sttClient} from '@models/stt/SttClient'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import {settings} from '@stores/'

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
    const enabled = settings.sttEnabled
    const error = sttClient.lastError

    return <>
      <FabWithTooltip size={props.size} color={enabled ? 'secondary' : 'primary'} aria-label="stt"
        title={error ? t('sttUnavailable', {reason: error}) : t('ttStt')}
        onClick={() => {
          settings.sttEnabled = !settings.sttEnabled
          settings.save()
        }}
        onClickMore={(ev) => { setMenuEl(ev.currentTarget) }}
      >
        {enabled ? <SubtitlesIcon style={{width:props.iconSize, height:props.iconSize}} />
          : <SubtitlesOffIcon style={{width:props.iconSize, height:props.iconSize}} />}
      </FabWithTooltip>
      {menuEl ? <Menu anchorEl={menuEl} keepMounted={true} open={Boolean(menuEl)}
        onClose={() => setMenuEl(null)}>
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
