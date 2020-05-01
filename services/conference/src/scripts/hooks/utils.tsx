import React, {useMemo} from 'react'

export function memoComponent<Prop extends {}>(
  Component: React.FC<Prop>,
  depAttr: (keyof Prop)[],
  ): React.FC<Prop> {

  return (props) => {
    return useMemo(() => <Component { ...props } />, depAttr.map(attr => props[attr]))
  }
}
