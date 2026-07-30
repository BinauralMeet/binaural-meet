//  Pure logic for Base.tsx, deliberately free of any @stores/@models imports so it's
//  unit-testable in isolation -- importing Base.tsx itself transitively constructs the whole app
//  singleton graph (via @stores/map/Map -> participants -> ... -> StereoManager, which needs a
//  real browser AudioContext jsdom doesn't provide).

//  Clamps a proposed zoom multiplier `scale` so that `currentScale * scale` stays within
//  [minScale, maxScale] -- returns a (possibly adjusted) multiplier to apply, not the resulting
//  absolute scale itself.
export function limitScale(currentScale: number, scale: number, minScale: number, maxScale: number): number {
  const targetScale = currentScale * scale

  if (targetScale > maxScale) {
    return maxScale / currentScale
  }

  if (targetScale < minScale) {
    return minScale / currentScale
  }

  return scale
}

//  When thirdPersonView toggles, Base.tsx re-levels the map so it reads as "upright" in the new
//  view: entering third-person view cancels out the map's own rotation; leaving it cancels out
//  the map rotation plus the avatar's own facing. Returns the degrees to rotate by, or undefined
//  if the current orientation is already correct (matches the original's `if (angle)` guards,
//  which skip writing a no-op matrix).
export function thirdPersonViewRotationAngle(
  entering: boolean, mapRotDeg: number, avatarRotDeg: number,
): number | undefined {
  const angle = entering ? -mapRotDeg : -(avatarRotDeg + mapRotDeg)

  return angle === 0 ? undefined : angle
}
