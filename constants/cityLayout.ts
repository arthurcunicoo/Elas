// Shared by the background and forms: login and cadastro always align.
export function getCityLayout(width: number, height: number, welcome = false) {
  const cityHeight = height * .50;
  const bottom = welcome ? height * .735 : Math.min(height * .39, width * .70) + 56;
  return { cityHeight, top: bottom - cityHeight, bottom };
}
