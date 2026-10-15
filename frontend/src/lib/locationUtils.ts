/**
 * Utility functions for parsing location URLs, coordinates, and generating navigation links.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Validates whether latitude and longitude are valid numeric geographic coordinates.
 */
export function isValidLatLng(lat: any, lng: any): boolean {
  const numLat = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const numLng = typeof lng === 'number' ? lng : parseFloat(String(lng));
  return (
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180
  );
}

/**
 * Robust regex extractor to pull latitude & longitude from any Google Maps,
 * OpenStreetMap, Apple Maps URL, or raw coordinate string.
 */
export function extractCoordsFromUrl(input: string | null | undefined): LatLng | null {
  if (!input || typeof input !== 'string') return null;
  let str = input.trim();
  try { str = decodeURIComponent(str); } catch { /* Keep the original URL if encoding is malformed. */ }

  const patterns = [
    // Google Maps place pin. Prefer this over @lat,lng, which is often only the map viewport center.
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
    /[?&](?:q|query|ll|daddr|destination|loc|point)=(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/i,
    /\/place\/(-?\d+(?:\.\d+)?)[,\s+]+(-?\d+(?:\.\d+)?)/i,
    /[?&]mlat=(-?\d+(?:\.\d+)?).*?[?&]mlon=(-?\d+(?:\.\d+)?)/i,
    /#map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/i,
    /geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i,
    // Camera center is a last-resort fallback for links without a pin or destination.
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
    /(-?\d{1,2}\.\d{3,})[,\s+]+(-?\d{1,3}\.\d{3,})/
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }
  return null;
}

/**
 * Builds a direct Google Maps Driving Navigation directions URL.
 * If origin is omitted or undefined, Google Maps will automatically use the device's live current location ("My Location").
 */
export function buildNavigationUrl(
  destinationLat?: number | string | null,
  destinationLng?: number | string | null,
  originLat?: number | string | null,
  originLng?: number | string | null,
  fallbackUrl?: string | null
): string {
  const destLat = typeof destinationLat === 'number' ? destinationLat : parseFloat(String(destinationLat || ''));
  const destLng = typeof destinationLng === 'number' ? destinationLng : parseFloat(String(destinationLng || ''));

  if (isValidLatLng(destLat, destLng)) {
    const origLat = typeof originLat === 'number' ? originLat : parseFloat(String(originLat || ''));
    const origLng = typeof originLng === 'number' ? originLng : parseFloat(String(originLng || ''));

    if (isValidLatLng(origLat, origLng)) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origLat},${origLng}&destination=${destLat},${destLng}&travelmode=driving`;
    }
    // Omit origin so Google Maps app on Android/iOS/Desktop uses current GPS location
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  }

  // If coordinates are not valid but a raw fallback URL was provided
  if (fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
    return fallbackUrl;
  }

  // Do not invent a destination when the complaint has no verified coordinates.
  return fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))
    ? fallbackUrl
    : 'https://www.google.com/maps';
}

/**
 * Returns the exact Google Maps / location link to view a pin.
 */
export function getExactLocationUrl(
  locationUrl?: string | null,
  lat?: number | string | null,
  lng?: number | string | null
): string {
  if (locationUrl && (locationUrl.startsWith('http://') || locationUrl.startsWith('https://'))) {
    return locationUrl;
  }
  const parsedLat = typeof lat === 'number' ? lat : parseFloat(String(lat || ''));
  const parsedLng = typeof lng === 'number' ? lng : parseFloat(String(lng || ''));
  if (isValidLatLng(parsedLat, parsedLng)) {
    return `https://maps.google.com/?q=${parsedLat},${parsedLng}`;
  }
  return 'https://www.google.com/maps';
}
