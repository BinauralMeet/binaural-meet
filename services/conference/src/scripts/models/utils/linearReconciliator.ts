type PopulationChangeAction = (id: string) => void

export function linearReconciliator(
  old: string[], current: string[],
  onRemove: PopulationChangeAction, onAdd: PopulationChangeAction) {

  let pOld = 0
  let pCurrent = 0

  // remove discarded
  while (pOld < old.length) {
    if (pCurrent < current.length && old[pOld] === current[pCurrent]) {
      pOld += 1
      pCurrent += 1
    } else {
      onRemove(old[pOld])
      pOld += 1
    }
  }

  // add new
  while (pCurrent < current.length) {
    onAdd(current[pCurrent])
    pCurrent += 1
  }
}
