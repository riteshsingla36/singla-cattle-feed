import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER = [20.5937, 78.9629];

// Create explicit custom icon to avoid Leaflet's broken default icon in bundlers
const greenIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  const handleDragEnd = (e) => {
    const latlng = e.target.getLatLng();
    window.dispatchEvent(new CustomEvent('marker-drag', {
      detail: { lat: latlng.lat, lng: latlng.lng },
    }));
  };

  if (!position) return null;

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={greenIcon}
      draggable={true}
      eventHandlers={{ dragend: handleDragEnd }}
    />
  );
}

export default function MapSection({ position, onLoaded }) {
  return (
    // z-0 + overflow-hidden to contain Leaflet's internal z-indexes from escaping
    <div className="relative z-0 overflow-hidden">
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
    </div>
  );
}
