import {describe, it, expect, vi, beforeEach} from 'vitest'
import {render, fireEvent} from '@testing-library/react'
import type {TextMessages} from '@models/ISharedContent'

const {LOCAL_ID, REMOTE_ID, storeState} = vi.hoisted(() => ({
  LOCAL_ID: 'local1',
  REMOTE_ID: 'remote1',
  storeState: {
    editing: '',
    beforeChangeEditing: undefined as ((cur: string, next: string) => void) | undefined,
  },
}))

vi.mock('@stores/', () => ({
  map: {keyInputUsers: new Set<string>()},
  participants: {
    localId: LOCAL_ID,
    local: {information: {name: 'Local', color: [0, 0, 0], textColor: [255, 255, 255]}},
    remote: new Map(),
  },
  contentSyncService: {
    get editing() { return storeState.editing },
    setEditing: (id: string) => { storeState.editing = id },
    setBeforeChangeEditing: (cb?: (cur: string, next: string) => void) => { storeState.beforeChangeEditing = cb },
  },
}))

// eslint-disable-next-line import/first
import {Text} from '../Text'

function makeContent(texts: TextMessages) {
  return {
    id: 'c1', type: 'text' as const, url: JSON.stringify(texts),
    pose: {position: [0, 0], orientation: 0}, size: [100, 100], originalSize: [100, 100],
    zorder: 1, pinned: false, name: '', ownerName: '', color: '#fff', textColor: '#000',
    overlapZones: [], surroundingZones: [],
  } as any
}

describe('Text', () => {
  beforeEach(() => {
    storeState.editing = ''
    storeState.beforeChangeEditing = undefined
  })

  it('renders a message added by a remote participant', () => {
    const content = makeContent({
      messages: [{message: 'hello from remote', pid: REMOTE_ID, name: 'Remote', time: 1}],
      scroll: [0, 0],
    })
    const {getByText} = render(<Text content={content} updateAndSend={() => {}} updateOnly={() => {}} />)
    getByText('hello from remote')
  })

  it('reflects an update to an existing remote message across re-renders', () => {
    const texts: TextMessages = {
      messages: [{message: 'v1', pid: REMOTE_ID, name: 'Remote', time: 1}],
      scroll: [0, 0],
    }
    const {getByText, rerender} = render(
      <Text content={makeContent(texts)} updateAndSend={() => {}} updateOnly={() => {}} />)
    getByText('v1')

    const updated: TextMessages = {
      messages: [{message: 'v2', pid: REMOTE_ID, name: 'Remote', time: 1}],
      scroll: [0, 0],
    }
    rerender(<Text content={makeContent(updated)} updateAndSend={() => {}} updateOnly={() => {}} />)
    getByText('v2')
  })

  //  Regression-relevant: this is the same "local state vs. incoming prop" reconciliation family
  //  as the Content.tsx memo bug found this session, just implemented via a manual merge instead
  //  of a memo comparator. A local participant's own in-progress message must survive even if a
  //  remote update (from someone else, not yet including this local edit) arrives in between.
  it('keeps the local participant editing their own message even when a remote-only update arrives', () => {
    storeState.editing = 'c1'
    const initial: TextMessages = {
      messages: [{message: 'my draft', pid: LOCAL_ID, name: 'Local', time: 5}],
      scroll: [0, 0],
    }
    const {getByDisplayValue, rerender} = render(
      <Text content={makeContent(initial)} updateAndSend={() => {}} updateOnly={() => {}} />)
    getByDisplayValue('my draft')

    //  A remote update comes in that doesn't mention the local user's draft at all (e.g. it only
    //  reflects a different, unrelated remote participant's message).
    const remoteOnlyUpdate: TextMessages = {
      messages: [{message: 'unrelated remote message', pid: REMOTE_ID, name: 'Remote', time: 6}],
      scroll: [0, 0],
    }
    rerender(<Text content={makeContent(remoteOnlyUpdate)} updateAndSend={() => {}} updateOnly={() => {}} />)

    //  The local draft must still be there, untouched by the remote-only update.
    getByDisplayValue('my draft')
  })

  it('removes a remote message that has been removed from the incoming content', () => {
    const withMessage: TextMessages = {
      messages: [{message: 'will be removed', pid: REMOTE_ID, name: 'Remote', time: 1}],
      scroll: [0, 0],
    }
    const {queryByText, rerender} = render(
      <Text content={makeContent(withMessage)} updateAndSend={() => {}} updateOnly={() => {}} />)
    expect(queryByText('will be removed')).not.toBeNull()

    const withoutMessage: TextMessages = {messages: [], scroll: [0, 0]}
    rerender(<Text content={makeContent(withoutMessage)} updateAndSend={() => {}} updateOnly={() => {}} />)
    expect(queryByText('will be removed')).toBeNull()
  })

  it('sends the typed draft once the textarea loses focus', () => {
    storeState.editing = 'c1'
    const initial: TextMessages = {
      messages: [{message: '', pid: LOCAL_ID, name: 'Local', time: 5}],
      scroll: [0, 0],
    }
    const updateAndSend = vi.fn()
    const {container, rerender} = render(
      <Text content={makeContent(initial)} updateAndSend={updateAndSend} updateOnly={() => {}} />
    )
    //  Text's own root <div ref={ref}> is only attached to `ref.current` after the first commit,
    //  but the children below it (which receive `div={ref.current}`) are computed during that
    //  same first render pass -- so the first pass always hands them `div=null`. A second render
    //  is what actually threads the real node through; re-render with identical props to get it.
    rerender(<Text content={makeContent(initial)} updateAndSend={updateAndSend} updateOnly={() => {}} />)

    //  The local user's own draft renders as an editable <textarea> while editing===true.
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()
    fireEvent.change(textarea!, {target: {value: 'about to send'}})
    //  Losing focus (e.g. clicking elsewhere) flushes the draft immediately, same as sendTextLater's
    //  throttled auto-send would once it fires -- this is what actually reaches updateAndSend.
    fireEvent.blur(textarea!)

    expect(updateAndSend).toHaveBeenCalled()
    const sent = JSON.parse(updateAndSend.mock.calls[0][0].url) as TextMessages
    expect(sent.messages.some(m => m.pid === LOCAL_ID && m.message === 'about to send')).toBe(true)
  })
})
