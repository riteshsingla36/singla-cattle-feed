'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER = [20.5937, 78.9629];

// Create explicit custom icon to avoid Leaflet's broken default icon in bundlers
const leafletMarkerIcon = L.icon({
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
      icon={leafletMarkerIcon}
      draggable={true}
      eventHandlers={{ dragend: handleDragEnd }}
    />
  );
}

/** Search box overlayed on the map */
function SearchOverlay({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = (value) => {
    setQuery(value);
    if (value.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=in&accept-language=en`,
          { headers: { 'User-Agent': 'SinglaTraders/1.0' } }
        );
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setSearching(false);
      }
    }, 600);
  };

  const handleSelect = (r) => {
    setOpen(false);
    setQuery('');
    onSelect({ lat: parseFloat(r.lat), lng: parseFloat(r.lon), address: r.display_name });
  };

  return (
    <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 z-[1000]">
      <div className="relative">
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search address..."
            className="flex-1 px-3 py-2.5 text-sm bg-transparent text-gray-900 dark:text-gray-100 outline-none placeholder-gray-400 rounded-xl"
          />
          {searching && (
            <div className="mr-3">
              <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-[1000]">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapSection({ position, onSelect }) {
  console.log('🗺️ MapSection rendering, position:', position, 'onSelect:', !!onSelect);

  return (
    <div className="relative h-full w-full">
      <SearchOverlay onSelect={onSelect} />
      <MapContainer
        center={position || INDIA_CENTER}
        zoom={position ? 15 : 5}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
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
