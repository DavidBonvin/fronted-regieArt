import { Linking } from 'react-native';

export type NavProvider = 'google' | 'waze';

export async function openGPSNavigation(
  lat: number,
  lng: number,
  provider: NavProvider = 'google',
): Promise<void> {
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const wazeNativeUrl = `waze://ul?ll=${lat},${lng}&navigate=yes`;

  if (provider === 'waze') {
    const canOpen = await Linking.canOpenURL(wazeNativeUrl);
    if (canOpen) {
      await Linking.openURL(wazeNativeUrl);
      return;
    }
  }
  await Linking.openURL(googleUrl);
}
