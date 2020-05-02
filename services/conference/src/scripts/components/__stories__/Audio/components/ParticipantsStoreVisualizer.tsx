import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

import {makeStyles} from '@material-ui/core'
import {Audiotrack} from '@material-ui/icons'
import {assert} from 'models/utils'

const useStylesPs = makeStyles({
  root: {
    position: 'relative',
  },
})

export const ParticipantsVisualizer: React.FC<{}> = () => {
  const classes = useStylesPs()
  const participants = usePsStore()

  const elements = useObserver(() => {
    const ids = Array.from(participants.remote.keys())
    console.log('ids', ids)

    return ids.map(id => (
      <MemoedParticipant key={id} id={id} />
    ))
  })

  return (
    <div className={classes.root}>
      {elements}
    </div>
  )
}

const useStylesP = makeStyles({
  root: (props: [number, number]) => ({
    position: 'absolute',
    left: `${props[0] * 0.5}vh`,
    top: `${props[1] * 0.5}vh`,
  }),
})

interface ParticipantProps {
  id: string
}
const ParticipantVisualizer: React.FC<ParticipantProps> = (props) => {
  const participant = usePsStore().find(props.id)
  assert(participant !== undefined)
  console.log('render ', participant.id)

  const classes = useObserver(() => useStylesP(participant.pose.position))

  return (
    <div className={classes.root}>
      <Audiotrack />
    </div>
  )
}

const MemoedParticipant: React.FC<ParticipantProps> = memoComponent(ParticipantVisualizer, ['id'])
