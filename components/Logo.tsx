import { ReferenceCrop } from './ReferenceCrop';
export function Logo({ width }: { width: number }) {
  return <ReferenceCrop source={require('../assets/reference-welcome.png')} originalWidth={351} originalHeight={699} x={40} y={37} cropWidth={271} cropHeight={157} width={width} height={width * 157 / 271} />;
}
