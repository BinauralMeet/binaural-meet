import {useStore as usePsStore} from '@hooks/ParticipantsStore'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import CardHeader from '@material-ui/core/CardHeader'
import Grid from '@material-ui/core/Grid'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableRow from '@material-ui/core/TableRow'
import Typography from '@material-ui/core/Typography'
import {useObserver} from 'mobx-react-lite'
import React, {useMemo} from 'react'

export const ParticipantsVisualizer: React.FC<{}> = () => {
  console.log('render array')
  const participants = usePsStore()
  const ids = participants.participants.keys()
  const elements = useObserver(() => (Array.from(ids).map(id => (
    <MemoedParticipant key={id} id={id} />
  ))))

  return (
    <Grid container={true} spacing={3}>
      {elements}
    </Grid>
  )
}

const participantMap: { [key: string]: string[] } = {
  pose: ['position', 'orientation'],
  information: ['name', 'email', 'md5Email'],
}
interface ParticipantProps {
  id: string
}
const ParticipantVisualizer: React.FC<ParticipantProps> = (props) => {
  const participant = usePsStore().find(props.id) as any
  console.log('render ', participant.id)
  const elements = useObserver(() => Object.keys(participantMap).map(
    (key) => {
      const childs = participantMap[key].map(child => (
        <TableRow key={child}>
          <TableCell>{child}</TableCell>
          <TableCell align="right">{JSON.stringify(participant[key][child])}</TableCell>
        </TableRow>
      ))

      return (
        <div key={key}>
          <Typography variant="h6">{key}</Typography>
          <TableContainer>
            <Table>
              <TableBody>
                {childs}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )
    },
  ))

  return (
    <Card>
      <CardHeader title={participant.id} />
      <CardContent>
        {elements}
      </CardContent>
    </Card>
  )
}

const MemoedParticipant: React.FC<ParticipantProps> = (props) => {
  const p = useMemo(
    () => (
      <Grid item={true} xs={3}>
        <ParticipantVisualizer id={props.id} />
      </Grid>
    ),
    [props.id],
  )

  return <>{p}</>
}
