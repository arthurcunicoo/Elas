export function acceptsInitialSession(
  active: boolean,
  changedByListener: boolean,
) {
  return active && !changedByListener;
}
