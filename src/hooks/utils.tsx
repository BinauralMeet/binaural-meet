import React, {useMemo} from 'react'

export function memoComponent<Prop extends {}>(
  Component: React.FC<Prop>,
  depAttr: (keyof Prop)[],
  ): React.FC<Prop> {

  return (props) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => <Component { ...props } />, depAttr.map(attr => props[attr]))
  }
}
