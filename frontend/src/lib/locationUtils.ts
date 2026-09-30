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
  const str = decodeURIComponent(input.trim());

  // 1. Google Maps @lat,lng e.g. /@30.3702123,78.1042456,17z
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 2. Query param style: q=lat,lng, query=lat,lng, ll=lat,lng, daddr=lat,lng, destination=lat,lng, loc=lat,lng
  const qMatch = str.match(/[?&](?:q|query|ll|daddr|destination|loc|point)=(-?\d+\.\d+)[,\s%20]+(-?\d+\.\d+)/i);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 3. OpenStreetMap / mlat & mlon query parameters
  const osmMatch = str.match(/[?&]mlat=(-?\d+\.\d+).*?[?&]mlo[ng]{1,2}=(-?\d+\.\d+)/i);
  if (osmMatch) {
    const lat = parseFloat(osmMatch[1]);
    const lng = parseFloat(osmMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 4. OpenStreetMap hash format: #map=16/30.3702/78.1042
  const osmHashMatch = str.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/i);
  if (osmHashMatch) {
    const lat = parseFloat(osmHashMatch[1]);
    const lng = parseFloat(osmHashMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 5. Google Maps place coordinates: /place/30.3702,78.1042 or /place/30.3702+78.1042
  const placeMatch = str.match(/\/place\/(-?\d+\.\d+)[,\s+%20]+(-?\d+\.\d+)/i);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 6. geo: URI scheme e.g. geo:30.3702,78.1042
  const geoMatch = str.match(/geo:(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (geoMatch) {
    const lat = parseFloat(geoMatch[1]);
    const lng = parseFloat(geoMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 7. Plain string coordinate pattern: "30.3702, 78.1042" or "30.3702,78.1042"
  const rawCoordMatch = str.match(/^(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)$/);
  if (rawCoordMatch) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // 8. General coordinate pattern inside any text (at least 3 decimal digits)
  const genericMatch = str.match(/(-?\d{1,2}\.\d{3,})[,\s%20]+(-?\d{1,3}\.\d{3,})/);
  if (genericMatch) {
    const lat = parseFloat(genericMatch[1]);
    const lng = parseFloat(genericMatch[2]);
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

  // Ultimate fallback to Dehradun center
  return `https://www.google.com/maps/dir/?api=1&destination=30.3256,78.0436&travelmode=driving`;
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
  return 'https://maps.google.com/?q=30.3256,78.0436';
}
