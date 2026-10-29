/** Offset in map pixels so a selected pin sits between the search and detail panel. */
export function focusPixelOffset(
  height: number,
  topInset: number,
  bottomInset: number,
) {
  const top = Math.max(0, Math.min(height, topInset));
  const bottom = Math.max(0, Math.min(height - top, bottomInset));
  return height / 2 - (top + (height - top - bottom) / 2);
}

export function detailPanelMaxHeight(height: number, panelTop: number) {
  // Leave room for a marker above the panel; the panel body scrolls on short screens.
  return Math.max(128, height - panelTop - 136);
}
