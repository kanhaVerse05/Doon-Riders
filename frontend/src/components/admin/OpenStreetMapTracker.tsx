'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Navigation, MapPin, ExternalLink, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface OpenStreetMapTrackerProps {
  technicianLat: number;
  technicianLng: number;
  customerLat: number;
  customerLng: number;
  technicianName?: string;
  scooterNumber?: string;
  customerName?: string;
  customerAddress?: string;
  isEnRoute?: boolean;
  status?: string;
  lastUpdated?: string | null;
}

// Calculate distance in KM using Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

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
  const routeLineRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const validTechLat = typeof technicianLat === 'number' && !isNaN(technicianLat) ? technicianLat : 30.2863;
  const validTechLng = typeof technicianLng === 'number' && !isNaN(technicianLng) ? technicianLng : 78.0069;
  const validCustLat = typeof customerLat === 'number' && !isNaN(customerLat) ? customerLat : 30.3256;
  const validCustLng = typeof customerLng === 'number' && !isNaN(customerLng) ? customerLng : 78.0436;

  const distanceKm = calculateDistanceKm(validTechLat, validTechLng, validCustLat, validCustLng);
  const estimatedMins = Math.max(3, Math.round(distanceKm * 3)); // Average 20 km/h in city traffic

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      // Dynamically import Leaflet to ensure SSR safety
      const L = (await import('leaflet')).default;

      // Inject Leaflet CSS if not already loaded
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create Custom SVG Marker Icons
      const techIcon = L.divIcon({
        className: 'custom-leaflet-tech-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: #2563EB; border: 3px solid #60A5FA; display: flex; items-center: center; justify-content: center; box-shadow: 0 4px 14px rgba(37,99,235,0.6);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 6px; margin-left: 6px;">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
            </div>
            <div style="background: #0F172A; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-top: 3px; white-space: nowrap; border: 1px solid #334155; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
              🏍️ ${technicianName}
            </div>
          </div>
        `,
        iconSize: [40, 60],
        iconAnchor: [20, 30]
      });

      const customerIcon = L.divIcon({
        className: 'custom-leaflet-cust-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: #DC2626; border: 3px solid #F87171; display: flex; items-center: center; justify-content: center; box-shadow: 0 4px 14px rgba(220,38,38,0.6);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 6px; margin-left: 6px;">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="background: #0F172A; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; margin-top: 3px; white-space: nowrap; border: 1px solid #334155; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
              📍 ${scooterNumber}
            </div>
          </div>
        `,
        iconSize: [40, 60],
        iconAnchor: [20, 30]
      });

      // Initialize Leaflet Map centered between both points
      const centerLat = (validTechLat + validCustLat) / 2;
      const centerLng = (validTechLng + validCustLng) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Free OpenStreetMap CartoDB / OSM Tile Layer (High contrast & clean)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Add Attribution at bottom right
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      // Add Technician Marker
      const techMarker = L.marker([validTechLat, validTechLng], { icon: techIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #2563EB;">🏍️ Technician: ${technicianName}</strong><br/>
            <span>Status: <b>${status}</b></span><br/>
            <span style="font-size: 10px; color: #64748B;">GPS: ${validTechLat.toFixed(4)}, ${validTechLng.toFixed(4)}</span>
          </div>
        `);
      techMarkerRef.current = techMarker;

      // Add Customer / Breakdown Marker
      L.marker([validCustLat, validCustLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #DC2626;">📍 Breakdown: ${scooterNumber}</strong><br/>
            <span>Customer: <b>${customerName}</b></span><br/>
            <span style="font-size: 11px; color: #475569;">${customerAddress}</span>
          </div>
        `);

      // Draw Route Polyline
      const routeLine = L.polyline(
        [
          [validTechLat, validTechLng],
          [validCustLat, validCustLng]
        ],
        {
          color: '#00D96B',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8'
        }
      ).addTo(map);
      routeLineRef.current = routeLine;

      // Fit map view bounds with padding
      const bounds = L.latLngBounds([
        [validTechLat, validTechLng],
        [validCustLat, validCustLng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });

      mapInstanceRef.current = map;
      setMapLoaded(true);
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [validCustLat, validCustLng]);

  // Update Technician marker position if GPS coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && techMarkerRef.current && routeLineRef.current) {
      techMarkerRef.current.setLatLng([validTechLat, validTechLng]);
      routeLineRef.current.setLatLngs([
        [validTechLat, validTechLng],
        [validCustLat, validCustLng]
      ]);
    }
  }, [validTechLat, validTechLng, validCustLat, validCustLng]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const bounds = [
        [validTechLat, validTechLng],
        [validCustLat, validCustLng]
      ];
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // OpenStreetMap Web Directions URL
  const osmDirectionsUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${validTechLat}%2C${validTechLng}%3B${validCustLat}%2C${validCustLng}`;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-[#060A14] shadow-2xl flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-between pointer-events-none gap-2">
        <div className="bg-[#0A0F1D]/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 text-xs font-mono text-white flex items-center gap-2.5 shadow-xl pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-ping flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
              OpenStreetMap Live GPS
            </span>
            <span className="font-bold text-[#00D96B] text-[11px]">
              {validTechLat.toFixed(4)}° N, {validTechLng.toFixed(4)}° E
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <a
            href={osmDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-[#00D96B]/25 transition active:scale-95 cursor-pointer"
          >
            <span>OpenStreetMap</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-[380px] sm:h-[420px] z-0 bg-slate-900" />

      {/* Floating Bottom Left: Zoom & Recenter Controls */}
      <div className="absolute bottom-16 right-4 z-[400] flex flex-col gap-1.5 shadow-xl">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="w-9 h-9 rounded-xl bg-[#0A0F1D]/90 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 backdrop-blur-md transition cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="w-9 h-9 rounded-xl bg-[#0A0F1D]/90 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 backdrop-blur-md transition cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter Route"
          className="w-9 h-9 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] flex items-center justify-center font-bold shadow-md transition cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Live Route Telemetry Banner */}
      <div className="bg-[#0A0F1D] border-t border-slate-800/90 p-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm flex-shrink-0" />
            <span className="text-slate-300 font-semibold truncate">
              {technicianName}
            </span>
          </div>
          <span className="text-slate-600 font-bold">&rarr;</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm flex-shrink-0" />
            <span className="text-slate-300 font-semibold truncate">
              {customerAddress}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800 font-mono text-[11px] self-end sm:self-auto">
          <span className="text-slate-400">Route Distance:</span>
          <span className="font-bold text-[#00D96B]">~ {distanceKm} KM</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-amber-400 font-bold">~ {estimatedMins} mins ETA</span>
        </div>
      </div>
    </div>
  );
};
