type PopulationChangeAction = (id: string) => void

export function linearReconciliator(
  old: string[], current: string[],
  onRemove: PopulationChangeAction, onAdd: PopulationChangeAction) {

  old.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)
  current.sort((a, b) => a < b ? -1 : a > b ? 1 : 0)

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
