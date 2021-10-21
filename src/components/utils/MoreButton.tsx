import IconButton from '@material-ui/core/IconButton'
import Zoom from '@material-ui/core/Zoom'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import React, {CSSProperties} from 'react'

//  utility to control more button
export interface MoreButtonMember{
  timeout:NodeJS.Timeout|undefined
}
export function moreButtonControl(setShowMore:(show:boolean) => void, member:MoreButtonMember) {
  return {
    onMouseOver(ev:React.MouseEvent) {
      //  console.log('over')
      if (! (ev.nativeEvent as any).sourceCapabilities?.firesTouchEvents) {
        if (member.timeout) {
          clearTimeout(member.timeout)
          member.timeout = undefined
        }
        setShowMore(true)
      }
    },
    onMouseOut(ev:React.MouseEvent) {
      //  console.log('out')
      if (member.timeout) {
        clearTimeout(member.timeout)
      }
      member.timeout = setTimeout(() => {
        setShowMore(false)
        member.timeout = undefined
      },                          500)
    },
  }
}


export type IconColor = 'inherit' | 'disabled' | 'primary' | 'secondary' | 'action' | 'error' | undefined
export type FabColor = 'inherit' | 'default' | 'primary' | 'secondary' | undefined
export interface MoreButtonProps{
  show: boolean
  htmlColor?: string
  iconColor?: IconColor
  color?: FabColor
  className?: string
  style?: CSSProperties
  onClickMore?(ev:React.PointerEvent|React.MouseEvent|React.TouchEvent): void
  buttonRef?: React.RefObject<HTMLButtonElement>
}

export const MoreButton: React.FC<MoreButtonProps> = (props) => {
  const handleClick = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (props.onClickMore) { props.onClickMore(event) }
  }

  return <Zoom in={props.show} style={props.style} >
    <IconButton className={props.className} color={props.color} onClick={handleClick}
      size={'small'} ref={props.buttonRef}
    >
      <MoreVertIcon color={props.iconColor} htmlColor={props.htmlColor} fontSize="large" />
    </IconButton>
  </Zoom>
}
