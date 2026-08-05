export type NavProvider = 'google' | 'waze';

const NAV_URLS: Record<NavProvider, (lat: number, lng: number) => string> = {
  google: (lat, lng) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  waze: (lat, lng) =>
    `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
};

export function openGPSNavigation(lat: number, lng: number, provider: NavProvider = 'google'): void {
  window.open(NAV_URLS[provider](lat, lng), '_blank', 'noopener,noreferrer');
}
