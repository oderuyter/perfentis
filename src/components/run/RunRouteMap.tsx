import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GpsPoint } from '@/types/run';

interface Props {
  points: GpsPoint[];
}

export function RunRouteMap({ points }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || points.length < 2) return;

    // Clean up previous map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const latlngs: L.LatLngExpression[] = points.map(p => [p.lat, p.lng]);

    // Route polyline
    L.polyline(latlngs, {
      color: 'hsl(var(--primary))',
      weight: 4,
      opacity: 0.9,
      smoothFactor: 1,
    }).addTo(map);

    // Start marker
    const startIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:hsl(142,71%,45%);border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker(latlngs[0], { icon: startIcon }).addTo(map);

    // End marker
    const endIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:hsl(0,84%,60%);border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(map);

    // Fit bounds
    const bounds = L.latLngBounds(latlngs);
    map.fitBounds(bounds, { padding: [20, 20] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  return <div ref={mapRef} className="w-full h-full" />;
}
