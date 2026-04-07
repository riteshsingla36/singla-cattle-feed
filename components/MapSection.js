import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons (CDN URLs)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const INDIA_CENTER = [20.5937, 78.9629];

/** Handles map clicks — dispatches custom event for parent */
function MapClickHandler() {
  useMapEvents({
    click: (e) => {
      window.dispatchEvent(new CustomEvent('map-click', {
        detail: { lat: e.latlng.lat, lng: e.latlng.lng },
      }));
    },
  });
  return null;
}

/** Handles map center updates when position changes */
function PositionUpdater({ position }) {
  const map = useMap();
  const initialFlyTo = useRef(false);

  useEffect(() => {
    if (position && !initialFlyTo.current) {
      initialFlyTo.current = true;
      map.setView([position.lat, position.lng], 15);
    }
  }, []);

  return null;
}

/** Draggable marker that dispatches drag-end events */
function DraggableMarker({ position }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    }
  }, [position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = (e) => {
    const latlng = e.target.getLatLng();
    window.dispatchEvent(new CustomEvent('marker-drag', {
      detail: { lat: latlng.lat, lng: latlng.lng },
    }));
  };

  if (!position) return null;

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      draggable={true}
      eventHandlers={{ dragend: handleDragEnd }}
    />
  );
}

export default function MapSection({ position, onLoaded }) {
  return (
    <MapContainer
      center={position || INDIA_CENTER}
      zoom={position ? 15 : 5}
      style={{ height: '100%', width: '100%' }}
      whenCreated={onLoaded}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <MapClickHandler />
      <PositionUpdater position={position} />
      <DraggableMarker position={position} />
    </MapContainer>
  );
}
