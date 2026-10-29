// Shared by the background and forms: login and cadastro always align.
export function getCityLayout(width: number, height: number, welcome = false) {
  const cityHeight = height * 0.42;
  const bottom = welcome
    ? height * 0.68
    : Math.min(height * 0.34, width * 0.64);
  return { cityHeight, top: bottom - cityHeight, bottom };
}
