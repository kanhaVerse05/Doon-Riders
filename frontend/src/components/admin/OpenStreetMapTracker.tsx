'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, ExternalLink, RotateCw, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';

interface OpenStreetMapTrackerProps {
  technicianLat: number | null;
  technicianLng: number | null;
  customerLat: number | null;
  customerLng: number | null;
  technicianName?: string;
  scooterNumber?: string;
  customerName?: string;
  customerAddress?: string;
  isEnRoute?: boolean;
  status?: string;
  lastUpdated?: string | null;
}

// Fallback Haversine calculation
function calculateStraightDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]!));

export const OpenStreetMapTracker: React.FC<OpenStreetMapTrackerProps> = ({
  technicianLat,
  technicianLng,
  customerLat,
  customerLng,
  technicianName = 'Technician',
  scooterNumber = 'Scooty',
  customerName = 'Customer',
  customerAddress = 'Breakdown Spot',
  isEnRoute = false,
  status = 'Assigned',
  lastUpdated
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const techMarkerRef = useRef<any>(null);
  const custMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const glowLineRef = useRef<any>(null);
  const lastFetchedCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [autoFollow, setAutoFollow] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMins: number;
    isRealRoad: boolean;
  }>({
    distanceKm: 0,
    durationMins: 0,
    isRealRoad: false
  });

  const [loadingRoute, setLoadingRoute] = useState(false);
  const isLocationFresh = !!lastUpdated && Number.isFinite(new Date(lastUpdated).getTime()) &&
    Date.now() - new Date(lastUpdated).getTime() <= 2 * 60 * 1000;

  const hasTechLocation = Number.isFinite(technicianLat) && Number.isFinite(technicianLng) &&
    technicianLat! >= -90 && technicianLat! <= 90 && technicianLng! >= -180 && technicianLng! <= 180;
  const hasCustomerLocation = Number.isFinite(customerLat) && Number.isFinite(customerLng) &&
    customerLat! >= -90 && customerLat! <= 90 && customerLng! >= -180 && customerLng! <= 180;
  const validTechLat = hasTechLocation ? technicianLat! : null;
  const validTechLng = hasTechLocation ? technicianLng! : null;
  const validCustLat = hasCustomerLocation ? customerLat! : null;
  const validCustLng = hasCustomerLocation ? customerLng! : null;

  // Fetch real road route geometry from OSRM
  const fetchRealRoadRoute = useCallback(async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<[number, number][] | null> => {
    if (!hasTechLocation || !hasCustomerLocation) return null;
    try {
      setLoadingRoute(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('OSRM routing request failed');
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map((pt: [number, number]) => [pt[1], pt[0]]);
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMins = Math.max(1, Math.round(route.duration / 60));

        setRouteInfo({
          distanceKm: distanceKm > 0 ? distanceKm : 0.1,
          durationMins: durationMins,
          isRealRoad: true
        });

        lastFetchedCoordsRef.current = { lat: startLat, lng: startLng };
        return coordinates;
      }
    } catch (err) {
      // Fallback to straight line distance
      const straightDist = calculateStraightDistanceKm(startLat, startLng, endLat, endLng);
      const estimatedMins = Math.max(2, Math.round(straightDist * 3));
      setRouteInfo({
        distanceKm: straightDist,
        durationMins: estimatedMins,
        isRealRoad: false
      });
    } finally {
      setLoadingRoute(false);
    }
    return null;
  }, [hasTechLocation, hasCustomerLocation]);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (!hasCustomerLocation || validCustLat === null || validCustLng === null) return;

      const L = (await import('leaflet')).default;

      // Inject Leaflet CSS & Radar Keyframes if missing
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-custom-animations')) {
        const style = document.createElement('style');
        style.id = 'leaflet-custom-animations';
        style.innerHTML = `
          @keyframes leaflet-rider-ping {
            0% { transform: scale(0.6); opacity: 0.9; }
            50% { transform: scale(1.6); opacity: 0.35; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          .animate-rider-pulse {
            animation: leaflet-rider-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
        `;
        document.head.appendChild(style);
      }

      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // 1. Delivery Rider Pulse Marker (Live GPS)
      const safeTechnicianName = escapeHtml(technicianName);
      const safeCustomerName = escapeHtml(customerName);
      const safeScooterNumber = escapeHtml(scooterNumber);
      const safeCustomerAddress = escapeHtml(customerAddress);
      const techIcon = L.divIcon({
        className: 'delivery-tech-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div class="animate-rider-pulse" style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(0, 217, 107, 0.4);"></div>
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #0A0F1D; border: 3px solid #00D96B; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(0, 217, 107, 0.6); z-index: 2;">
              <span style="font-size: 19px;">🏍️</span>
            </div>
            <div style="background: #0A0F1D; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 20px; margin-top: 4px; white-space: nowrap; border: 1.5px solid #00D96B; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 3; display: flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #00D96B; display: inline-block;"></span>
              <span>${safeTechnicianName}</span>
            </div>
          </div>
        `,
        iconSize: [50, 70],
        iconAnchor: [25, 35]
      });

      // 2. Customer Breakdown Destination Marker
      const customerIcon = L.divIcon({
        className: 'delivery-customer-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div class="animate-rider-pulse" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(239, 68, 68, 0.3);"></div>
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #DC2626; border: 3px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(220, 38, 38, 0.5); z-index: 2;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="background: #111827; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 20px; margin-top: 4px; white-space: nowrap; border: 1px solid #EF4444; box-shadow: 0 4px 10px rgba(0,0,0,0.4); z-index: 3;">
              📍 ${safeScooterNumber} (${safeCustomerName})
            </div>
          </div>
        `,
        iconSize: [44, 64],
        iconAnchor: [22, 32]
      });

      // Initialize Leaflet Map
      const map = L.map(mapContainerRef.current, {
        center: hasTechLocation ? [(validTechLat! + validCustLat) / 2, (validTechLng! + validCustLng) / 2] : [validCustLat, validCustLng],
        zoom: hasTechLocation ? 13 : 15,
        zoomControl: false,
        attributionControl: false
      });
      mapInstanceRef.current = map;

      // Free High-Resolution OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Add Attribution at bottom right
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      // Add Technician Marker
      if (hasTechLocation && validTechLat !== null && validTechLng !== null) {
        const techMarker = L.marker([validTechLat, validTechLng], { icon: techIcon })
          .addTo(map)
          .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #00A854;">🏍️ Technician: ${safeTechnicianName}</strong><br/>
            <span>Status: <b>${status}</b></span><br/>
            <span style="font-size: 10px; color: #64748B;">GPS: ${Number(validTechLat).toFixed(4)}, ${Number(validTechLng).toFixed(4)}</span>
          </div>
          `);
        techMarkerRef.current = techMarker;
      }

      // Add Customer Marker
      const custMarker = L.marker([validCustLat, validCustLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #DC2626;">📍 Breakdown Spot: ${safeScooterNumber}</strong><br/>
            <span>Customer: <b>${safeCustomerName}</b></span><br/>
            <span style="font-size: 11px; color: #475569;">${safeCustomerAddress}</span><br/>
            <span style="font-size: 10px; color: #64748B;">GPS: ${Number(validCustLat).toFixed(4)}, ${Number(validCustLng).toFixed(4)}</span>
          </div>
        `);
      custMarkerRef.current = custMarker;

      // Fetch Initial Real Road Route
      if (!isMounted) return;
      const roadCoords = hasTechLocation && validTechLat !== null && validTechLng !== null
        ? await fetchRealRoadRoute(validTechLat, validTechLng, validCustLat, validCustLng)
        : null;
      const pointsToDraw: [number, number][] = roadCoords && roadCoords.length > 0 ? roadCoords : [];

      // Outer Ambient Glow Polyline
      const glowLine = pointsToDraw.length ? L.polyline(pointsToDraw as any, {
        color: '#00D96B',
        weight: 9,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map) : null;
      glowLineRef.current = glowLine;

      // Inner Sharp Driving Road Polyline
      const routeLine = pointsToDraw.length ? L.polyline(pointsToDraw as any, {
        color: '#00B85C',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map) : null;
      routeLineRef.current = routeLine;

      // Fit map view bounds with padding
      if (pointsToDraw.length > 1) map.fitBounds(L.latLngBounds(pointsToDraw as any), { padding: [55, 55], maxZoom: 16 });
      else map.setView([validCustLat, validCustLng], 15);

    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [validCustLat, validCustLng, hasCustomerLocation, hasTechLocation, fetchRealRoadRoute]);

  // Dynamic Realtime Position Updates: When technician GPS changes dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || !techMarkerRef.current || validTechLat === null || validTechLng === null || validCustLat === null || validCustLng === null) return;

    // 1. Smoothly update technician marker position
    techMarkerRef.current.setLatLng([validTechLat, validTechLng]);
    techMarkerRef.current.setPopupContent(`
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
        <strong style="color: #00A854;">🏍️ Technician: ${escapeHtml(technicianName)}</strong><br/>
        <span>Status: <b>${status}</b></span><br/>
        <span style="font-size: 10px; color: #00A854; font-weight: 700;">GPS: ${Number(validTechLat).toFixed(4)}, ${Number(validTechLng).toFixed(4)}</span><br/>
        ${lastUpdated ? `<span style="font-size: 9px; color: #64748B;">Synced: ${new Date(lastUpdated).toLocaleTimeString('en-IN')}</span>` : ''}
      </div>
    `);

    // 2. Auto-follow camera if enabled: smoothly pans along with rider
    if (autoFollow) {
      mapInstanceRef.current.panTo([validTechLat, validTechLng], {
        animate: true,
        duration: 1.0
      });
    }

    // 3. Fetch updated driving road geometry from new position
    const lastFetched = lastFetchedCoordsRef.current;
    const movedSignificant = !lastFetched || 
      Math.abs(lastFetched.lat - validTechLat) > 0.0001 || 
      Math.abs(lastFetched.lng - validTechLng) > 0.0001;

    if (movedSignificant) {
      fetchRealRoadRoute(validTechLat, validTechLng, validCustLat, validCustLng).then((newCoords) => {
        const updatedPoints = newCoords && newCoords.length > 0 ? newCoords : [];
        if (updatedPoints.length) {
          if (routeLineRef.current) routeLineRef.current.setLatLngs(updatedPoints as any);
          if (glowLineRef.current) glowLineRef.current.setLatLngs(updatedPoints as any);
        } else {
          routeLineRef.current?.remove();
          glowLineRef.current?.remove();
          routeLineRef.current = null;
          glowLineRef.current = null;
        }
      });
    }
  }, [validTechLat, validTechLng, validCustLat, validCustLng, technicianName, status, lastUpdated, autoFollow, fetchRealRoadRoute]);

  // Recenter to show whole route
  const handleFitRoute = () => {
    if (mapInstanceRef.current) {
      if (routeLineRef.current && routeLineRef.current.getLatLngs().length > 0) {
        const bounds = routeLineRef.current.getBounds();
        mapInstanceRef.current.fitBounds(bounds, { padding: [55, 55], maxZoom: 16, animate: true });
      } else if (validCustLat !== null && validCustLng !== null) mapInstanceRef.current.setView([validCustLat, validCustLng], 15, { animate: true });
    }
  };

  // Focus directly on Technician Live Location
  const handleFocusRider = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([validTechLat, validTechLng], 16, { animate: true });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // OpenStreetMap Web Directions URL
  const osmDirectionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${validTechLat}%2C${validTechLng}%3B${validCustLat}%2C${validCustLng}`;

  return (
    <div className="relative isolate rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between pointer-events-none gap-2 flex-wrap">
        <div className="bg-[#0A0F1D]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700 text-xs font-mono text-white flex items-center gap-2.5 shadow-xl pointer-events-auto">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${hasTechLocation && isLocationFresh && isEnRoute ? 'bg-[#00D96B] animate-pulse' : 'bg-amber-400'}`} />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                {hasTechLocation ? (isLocationFresh && isEnRoute ? 'Live Technician Location' : 'Last Known Technician Location') : 'Waiting for Technician GPS'}
              </span>
              {loadingRoute && (
                <span className="w-2 h-2 rounded-full bg-[#00D96B] animate-spin" />
              )}
            </div>
            <span className="font-black text-[#00D96B] text-[11px]">
              {hasTechLocation ? `${validTechLat!.toFixed(5)}, ${validTechLng!.toFixed(5)}` : 'Location appears after technician starts sharing'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Auto-Follow Toggle */}
          {hasTechLocation && <button
            type="button"
            onClick={() => setAutoFollow(!autoFollow)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold border transition flex items-center gap-1.5 shadow-md cursor-pointer ${
              autoFollow
                ? 'bg-[#0A0F1D] text-[#00D96B] border-[#00D96B]/50'
                : 'bg-white/95 text-slate-600 border-slate-300'
            }`}
            title="Toggle camera auto-follow rider"
          >
            <Crosshair className={`w-3.5 h-3.5 ${autoFollow ? 'text-[#00D96B]' : 'text-slate-400'}`} />
            <span className="text-[11px] font-extrabold">{autoFollow ? 'Auto-Follow: ON' : 'Auto-Follow: OFF'}</span>
          </button>}

          {/* Live ETA / Distance */}
          {hasTechLocation && hasCustomerLocation && <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-lg flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold">{routeInfo.isRealRoad ? 'ETA:' : 'Approx.:'}</span>
            <span className="text-emerald-700 font-black font-mono">
              ~ {routeInfo.durationMins} Mins
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-900 font-black font-mono">
              {routeInfo.distanceKm} KM
            </span>
          </div>}

          {hasTechLocation && hasCustomerLocation && <a
            href={osmDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs px-3 py-2 rounded-2xl flex items-center gap-1.5 shadow-md shadow-[#00D96B]/25 transition active:scale-95 cursor-pointer"
            title="Open in OpenStreetMap"
          >
            <span>OSM Map</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>}
        </div>
      </div>

      {/* Map Container Element */}
      <div className="relative">
        <div ref={mapContainerRef} className="w-full h-[400px] sm:h-[460px] z-0 bg-[#F7F9FA]" />
        {!hasCustomerLocation && <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <MapPin className="mx-auto mb-2 h-6 w-6 text-amber-500" />
            <p className="text-sm font-bold text-slate-900">Customer pin is unavailable</p>
            <p className="mt-1 text-xs text-slate-500">Add a precise map link or coordinates to show the correct breakdown location.</p>
          </div>
        </div>}
      </div>

      {/* Floating Bottom Right Controls: Zoom, Focus Rider, Fit Route */}
      {hasCustomerLocation && <div className="absolute bottom-16 right-3 z-[20] flex flex-col gap-1.5 shadow-md">
        {hasTechLocation && <button
          type="button"
          onClick={handleFocusRider}
          title="Focus on Delivery Rider (Technician)"
          className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-black text-white flex items-center justify-center transition cursor-pointer shadow-sm border border-slate-700 active:scale-95"
        >
          <Crosshair className="w-4 h-4 text-[#00D96B]" />
        </button>}
        <button
          type="button"
          onClick={handleFitRoute}
          title="Fit Whole Road Route"
          className="w-9 h-9 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] flex items-center justify-center font-bold shadow-md transition cursor-pointer active:scale-95"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-9 h-9 rounded-xl bg-white/95 hover:bg-slate-50 text-[#111827] flex items-center justify-center border border-[#E5E7EB] backdrop-blur-md transition cursor-pointer shadow-sm"
        >
          <ZoomIn className="w-4 h-4 text-[#475467]" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-9 h-9 rounded-xl bg-white/95 hover:bg-slate-50 text-[#111827] flex items-center justify-center border border-[#E5E7EB] backdrop-blur-md transition cursor-pointer shadow-sm"
        >
          <ZoomOut className="w-4 h-4 text-[#475467]" />
        </button>
      </div>}

      {/* Bottom Live Route Telemetry Banner */}
      <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] p-3.5 sm:p-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#111827]">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
              🏍️
            </div>
            <span className="text-[#111827] font-bold truncate">
              {hasTechLocation ? technicianName : 'Waiting for technician GPS'}
            </span>
          </div>
          <span className="text-[#98A2B3] font-black">&rarr;</span>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold">
              📍
            </div>
            <span className="text-[#475467] font-semibold truncate max-w-[220px]">
              {customerAddress}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-[#00D96B]/30 font-mono text-[11px] self-end sm:self-auto shadow-xs">
          <span className="text-[#667085] font-semibold">{!hasTechLocation ? 'Customer pin:' : routeInfo.isRealRoad ? 'Road route:' : 'Direct distance:'}</span>
          <span className="font-black text-[#00A854]">{routeInfo.distanceKm} KM</span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-amber-700 font-extrabold">~ {routeInfo.durationMins} mins ETA</span>
          {routeInfo.isRealRoad && (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Road Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
