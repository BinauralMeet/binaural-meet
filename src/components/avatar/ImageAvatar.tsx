import Avatar from '@material-ui/core/Avatar';
import { makeStyles } from '@material-ui/core/styles';
import { Observer } from 'mobx-react-lite';
import React, { CSSProperties } from 'react';

export interface ImageAvatarProps {
  name: string;
  avatarSrc: string;
  colors: string[];
  size: number;
  style?: any;
  border?: boolean;
}

function avatarCommon(props: ImageAvatarProps) {
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

function addBorder(style: Object, props: ImageAvatarProps) {
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
    const style = avatarCommon(props);
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
    const style = avatarCommon(props);
    if (props.border) {
      addBorder(style, props);
    }

    return style;
  },
});

export const RawImageAvatar: React.FC<ImageAvatarProps> = (props: ImageAvatarProps) => {
  const classes = useStyles(props);

  return (
    <Observer>
      {() => {
        //console.log(`render ImageAvatar src=${props.avatarSrc} size=${props.size}`)

        let initial = '';
        const isImage = props.avatarSrc && props.avatarSrc.slice(-4) !== '.vrm';
        if (!isImage) {
          const nameArray = props.name.split(' ');
          nameArray.forEach((s) => (initial += s ? s.substring(0, 1) : ''));
          initial = initial.substring(0, 2);
        }
        const size = props.border ? props.size * BORDER_CONTENT : props.size;

        return isImage ? (
          <Avatar src={props.avatarSrc} className={classes.imageAvatar} />
        ) : (
          <Avatar className={classes.textAvatar}>
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
        );
      }}
    </Observer>
  );
};
RawImageAvatar.displayName = 'RawImageAvatar';

export const ImageAvatar = (props: ImageAvatarProps) =>
  React.useMemo(() => <RawImageAvatar {...props} />, [
    props.avatarSrc,
    props.border,
    props.colors,
    props.name,
    props.size,
    props.style,
  ]);
ImageAvatar.displayName = 'ImageAvatar';
