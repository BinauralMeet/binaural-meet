import Avatar from '@material-ui/core/Avatar';
import { makeStyles } from '@material-ui/core/styles';
import { Observer } from 'mobx-react-lite';
import React, { CSSProperties } from 'react';
import {AvatarProps} from './ComposedAvatar'
import { isVrmUrl } from '@models/utils';


interface ConnectedImageAvatarProps extends AvatarProps{
  border?: boolean
}


function avatarCommon(props: ImageAvatarProps){
  const style = {
    width: props.size,
    height: props.size,
    color: props.colors[1],
    backgroundColor: props.colors[0],
    pointerEvents: 'none' as const,
    userDrag: 'none' as const,
    fontSize: props.size * 0.3,
    display: 'inline-block',
  };

  return style;
}

const BORDER_WIDTH = 0.04;
const BORDER_CONTENT = 1 - BORDER_WIDTH * 2;

function addBorder(style: Object, props: ImageAvatarProps){
  const border = {
    width: props.size * BORDER_CONTENT,
    height: props.size * BORDER_CONTENT,
    borderStyle: 'solid' as const,
    borderWidth: props.size * BORDER_WIDTH,
    borderColor: props.colors[0],
  };

  return Object.assign(style, border);
}

const useStyles = makeStyles({
  imageAvatar: (props: ImageAvatarProps) => {
    const style = avatarCommon(props)
    const style2:CSSProperties = {
      textAlign: 'right',
      verticalAlign: 'top',
    }
    Object.assign(style, style2);
    if (props.border) {
      addBorder(style, props);
    }

    return style;
  },
  textAvatar: (props: ImageAvatarProps) => {
    const style = avatarCommon(props)
    if (props.border) {
      addBorder(style, props);
    }

    return style;
  },
});


export interface ImageAvatarProps{
  border?: boolean
  avatarSrc: string
  name: string
  size: number
  colors: string[]
}
export const ImageAvatar: React.FC<ImageAvatarProps> = (props: ImageAvatarProps)=>{
  const classes = useStyles({...props, colors:props.colors});
  const avatarSrc = props.avatarSrc
  const isImage = avatarSrc && !isVrmUrl(avatarSrc)
  const size = props.border ? props.size * BORDER_CONTENT : props.size;
  if (isImage) {
    return <Avatar src={avatarSrc} className={classes.imageAvatar} />
  }else{
    const name = props.name
    let initial = '';
    const nameArray = name.split(' ');
    nameArray.forEach((s) => (initial += s ? s.substring(0, 1) : ''));
    initial = initial.substring(0, 2);
    return <Avatar className={classes.textAvatar}>
      <div
        style={{
          height: size,
          width: size,
          fontSize: Math.floor(size * 0.33),
          textAlign: 'center',
          verticalAlign: 'middle',
          display: 'table-cell',
          whiteSpace: 'nowrap',
        }}
      >
        {initial}
      </div>
    </Avatar>
  }
}
ImageAvatar.displayName = 'ImageAvatar';


export const ConnectedImageAvatar: React.FC<ConnectedImageAvatarProps> = (props: ConnectedImageAvatarProps) => {
  return (
    <Observer>{() => {
      //console.log(`render ImageAvatar src=${props.avatarSrc} size=${props.size}`)
      const args:ImageAvatarProps = {
        border: props.border,
        avatarSrc: props.participant.information.avatarSrc,
        name: props.participant.information.name,
        size: props.size,
        colors: props.participant.getColor()
      }

      return <ImageAvatar {...args}/>
    }}</Observer>
  );
};
ConnectedImageAvatar.displayName = 'ConnectedImageAvatar';
