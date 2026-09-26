//  Footer control for subtitles. The button is *my* view (show subtitles or not, and in which
//  language), and the menu only carries the two language choices -- there is no switch for
//  transcription itself: turning subtitles on anywhere in the room starts it for everyone
//  (`stt-translation#ui`), so the one visible switch is the one people actually think about.
import {FabWithTooltip} from '@components/utils/FabEx'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import ListSubheader from '@material-ui/core/ListSubheader'
import SubtitlesIcon from '@material-ui/icons/Subtitles'
import SubtitlesOffIcon from '@material-ui/icons/SpeakerNotesOff'
import {t, useTranslation} from '@models/locales'
import {sttClient} from '@models/stt/SttClient'
import {anyoneWantsSubtitles} from '@models/stt/SttLogic'
import {Observer} from 'mobx-react-lite'
import React from 'react'
import participants from '@stores/participants/Participants'
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
    const showing = settings.showSubtitles
    //  Somebody else's subtitles being on means my voice is being transcribed even while I am
    //  not reading any. That is worth saying out loud rather than leaving the button looking off.
    const roomOn = anyoneWantsSubtitles(showing, Array.from(participants.remote.values()))
    const error = sttClient.lastError
    const title = error ? t('sttUnavailable', {reason: error})
      : showing ? t('ttSttShown')
        : roomOn ? t('ttSttHiddenOthersOn') : t('ttSttHidden')

    return <>
      <FabWithTooltip size={props.size} color={showing ? 'secondary' : 'primary'}
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
