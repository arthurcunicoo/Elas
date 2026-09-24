import { Image, ImageSourcePropType, View } from 'react-native';

type Props = { source: ImageSourcePropType; originalWidth: number; originalHeight: number; x?: number; y?: number; cropWidth: number; cropHeight: number; width: number; height: number };
// Clip the supplied reference in native layout. Keep the original image unchanged.
export function ReferenceCrop({ source, originalWidth, originalHeight, x = 0, y = 0, cropWidth, cropHeight, width, height }: Props) {
  const scale = Math.max(width / cropWidth, height / cropHeight);
  return <View accessible={false} pointerEvents="none" style={{ width, height, overflow: 'hidden' }}>
    <Image source={source} resizeMode="stretch" style={{ position: 'absolute', width: originalWidth * scale, height: originalHeight * scale, left: -x * scale + (width - cropWidth * scale) / 2, top: -y * scale }} />
  </View>;
}
