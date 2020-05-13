import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import {memoComponent} from '@hooks/utils'
import {useObserver} from 'mobx-react-lite'
import React from 'react'

import {makeStyles} from '@material-ui/core/styles'
import {Audiotrack, Hearing} from '@material-ui/icons'

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

    return ids.map(id => (
      <MemoedParticipant key={id} id={id} type={'remote'} />
    ))
  })

  const local = useObserver(() => {
    const store = participants.local.get()

    return <MemoedParticipant key={store.id} id={store.id} type={'local'} />
  })

  return (
    <div className={classes.root}>
      {elements}
      {local}
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
  type: 'remote' | 'local'
}
const ParticipantVisualizer: React.FC<ParticipantProps> = (props) => {
  const participant = usePsStore().find(props.id)
  console.log('render ', participant.id)

  const classes = useObserver(() => useStylesP(participant.pose.position))

  return (
    <div className={classes.root}>
      {props.type === 'remote' ? <Audiotrack /> : <Hearing />}
    </div>
  )
}

const MemoedParticipant: React.FC<ParticipantProps> = memoComponent(ParticipantVisualizer, ['id'])
