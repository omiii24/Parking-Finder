import React, { useState, useMemo, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin, Search, ChevronDown, Map as MapIcon, List, Clock, IndianRupee,
  Camera, Zap, Umbrella, Accessibility, Wifi, ShieldCheck, X, Navigation,
  AlertTriangle, Loader2, RefreshCw, LogOut, CarFront,
} from "lucide-react";
import { trpc } from "./utils/trpc";

const ALL_AMENITIES = ["CCTV", "EV Charging", "Covered", "Wheelchair Accessible", "Free WiFi", "Valet Service"];

const AMENITY_ICON = {
  CCTV: Camera,
  "EV Charging": Zap,
  Covered: Umbrella,
  "Wheelchair Accessible": Accessibility,
  "Free WiFi": Wifi,
  "Valet Service": ShieldCheck,
};

const STATUS_STYLE = {
  Available: { bg: "#E7F6EC", text: "#1A7F3C" },
  Limited: { bg: "#FCF3D9", text: "#966B10" },
  Full: { bg: "#FBE7E7", text: "#B3261E" },
};

const STATUS_DOT = { Available: "#22C55E", Limited: "#EAB308", Full: "#EF4444" };

const MUMBAI_CENTER = { lat: 19.03, lng: 72.86 };
const POLL_INTERVAL_MS = 5000;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Limited;
  return (
    <span style={{ background: s.bg, color: s.text }} className="text-sm font-medium px-3 py-1 rounded-full shrink-0">
      {status}
    </span>
  );
}

function Tag({ label }) {
  const Icon = AMENITY_ICON[label];
  return (
    <span className="inline-flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
      {Icon && <Icon size={14} />}
      {label}
    </span>
  );
}

function generateSpaces(loc) {
  const spaces = [];
  for (let i = 1; i <= loc.total; i++) {
    spaces.push({ number: i, occupied: i <= loc.occupied, handicap: i % 25 === 0, ev: i % 17 === 0 });
  }
  return spaces;
}

function Card({ loc, onOpen }) {
  const pct = Math.round((loc.occupied / loc.total) * 100);
  const available = loc.total - loc.occupied;
  return (
    <button
      onClick={() => onOpen(loc)}
      className="text-left border border-gray-200 rounded-xl p-5 bg-white flex flex-col gap-3 hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-900 leading-snug">{loc.name}</h3>
        <Badge status={loc.status} />
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <MapPin size={14} />
        {loc.address}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-gray-900">{available}/{loc.total} slots</span>{" "}
          <span className="text-gray-400">({pct}% occupied)</span>
        </div>
        <span className="text-sm text-blue-600 font-medium">{loc.distance.toFixed(1)} km away</span>
      </div>
      <div className="flex items-center gap-5 text-sm text-gray-700">
        <span className="flex items-center gap-1"><IndianRupee size={13} />{loc.hourly}/hr</span>
        <span className="flex items-center gap-1"><IndianRupee size={13} />{loc.daily}/day</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Clock size={14} />
        {loc.hours}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {loc.amenities.map((a) => <Tag key={a} label={a} />)}
      </div>
    </button>
  );
}

function BookingSection({ loc, myCars, activeBookings, onBook, onExit, booking }) {
  const [selectedCarId, setSelectedCarId] = useState(myCars[0]?.id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const myBookingHere = activeBookings.find((b) => b.parkingLocationId === loc.id);
  const available = loc.total - loc.occupied;

  if (myBookingHere) {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-800">Your car is parked here</p>
          <p className="text-xs text-emerald-600">{myBookingHere.carLabel}</p>
        </div>
        <button
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onExit(myBookingHere.bookingId);
            setSubmitting(false);
          }}
          className="flex items-center gap-1.5 text-xs font-medium bg-white border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg"
        >
          <LogOut size={13} /> {submitting ? "Leaving..." : "I'm leaving"}
        </button>
      </div>
    );
  }

  if (myCars.length === 0) {
    return (
      <div className="border border-gray-200 bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
        Add a car in the My Car tab to book a slot here.
      </div>
    );
  }

  if (available <= 0) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-600">
        This location is full right now.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-700">Book this slot</p>
      {myCars.length > 1 && (
        <select
          value={selectedCarId ?? ""}
          onChange={(e) => setSelectedCarId(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-2.5 py-2 text-sm"
        >
          {myCars.map((c) => (
            <option key={c.id} value={c.id}>{c.brand} {c.model} ({c.carNumber})</option>
          ))}
        </select>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        disabled={submitting || !selectedCarId}
        onClick={async () => {
          setSubmitting(true);
          setError("");
          try {
            await onBook(loc.id, selectedCarId);
          } catch (err) {
            setError(err.message || "Booking failed");
          }
          setSubmitting(false);
        }}
        className="flex items-center justify-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50"
      >
        <CarFront size={15} /> {submitting ? "Booking..." : "Book this slot"}
      </button>
    </div>
  );
}

function DetailModal({ loc, onClose, onSimulate, myCars, activeBookings, onBook, onExit }) {
  const [tab, setTab] = useState("details");
  const spaces = useMemo(() => (loc ? generateSpaces(loc) : []), [loc]);
  if (!loc) return null;
  const available = loc.total - loc.occupied;
  const pct = Math.round((loc.occupied / loc.total) * 100);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[999]" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{loc.name}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={14} />{loc.address}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={20} /></button>
        </div>

        <div className="flex border-b border-gray-200 px-5">
          <button onClick={() => setTab("details")} className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === "details" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>Details</button>
          <button onClick={() => setTab("live")} className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === "live" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>Live View</button>
        </div>

        {tab === "details" ? (
          <div className="p-5 flex flex-col gap-4">
            <BookingSection loc={loc} myCars={myCars} activeBookings={activeBookings} onBook={onBook} onExit={onExit} />

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-400">Available / Total</p>
                <p className="text-lg font-semibold text-gray-900">{available}/{loc.total}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-400">Occupancy</p>
                <p className="text-lg font-semibold text-gray-900">{pct}%</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-400">Hourly Rate</p>
                <p className="text-lg font-semibold text-gray-900 flex items-center gap-0.5"><IndianRupee size={15} />{loc.hourly}/hr</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-400">Daily Rate</p>
                <p className="text-lg font-semibold text-gray-900 flex items-center gap-0.5"><IndianRupee size={15} />{loc.daily}/day</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600"><Clock size={15} /> Operating hours: {loc.hours}</div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Amenities</p>
              <div className="flex flex-wrap gap-2">{loc.amenities.map((a) => <Tag key={a} label={a} />)}</div>
            </div>
            <p className="text-xs text-gray-400">Last updated: {new Date(loc.updatedAt).toLocaleTimeString()}</p>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{available} available / {loc.total} total</p>
              <p className="text-sm text-gray-500">{pct}% occupied</p>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid gap-1.5 p-3 bg-gray-50 rounded-lg max-h-72 overflow-y-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(30px, 1fr))" }}>
              {spaces.map((s) => (
                <div key={s.number} title={`Space ${s.number}${s.handicap ? " · Accessible" : ""}${s.ev ? " · EV Charging" : ""}`} className={`relative h-7 rounded flex items-center justify-center text-[10px] font-medium transition-colors ${s.occupied ? "bg-red-400 text-white" : "bg-emerald-400 text-white"}`}>
                  {s.number}
                  {s.handicap && <Accessibility size={9} className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-[1px]" />}
                  {s.ev && <Zap size={9} className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-[1px]" />}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Occupied</span>
              <span className="flex items-center gap-1.5"><Accessibility size={12} /> Accessible</span>
              <span className="flex items-center gap-1.5"><Zap size={12} /> EV Charging</span>
            </div>
            <p className="text-xs text-gray-400">Note: the grid above is a demo layout, not real per-space sensor data. The counts above it are live.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FiltersPanel({ filters, setFilters, onClose }) {
  const toggleAmenity = (a) => {
    setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }));
  };
  return (
    <div className="absolute right-6 top-[72px] z-40 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={filters.availableOnly} onChange={(e) => setFilters((f) => ({ ...f, availableOnly: e.target.checked }))} />
        Show only available spaces
      </label>
      <div>
        <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
          <span>Max hourly price</span>
          <span className="text-gray-500">₹{filters.maxPrice}/hr</span>
        </div>
        <input type="range" min={20} max={80} value={filters.maxPrice} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: Number(e.target.value) }))} className="w-full" />
      </div>
      <div>
        <p className="text-sm text-gray-700 mb-2">Amenities</p>
        <div className="flex flex-wrap gap-2">
          {ALL_AMENITIES.map((a) => (
            <button key={a} onClick={() => toggleAmenity(a)} className={`text-xs px-2.5 py-1.5 rounded-md border ${filters.amenities.includes(a) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>{a}</button>
          ))}
        </div>
      </div>
      <button onClick={onClose} className="text-sm font-medium text-blue-600 self-end">Done</button>
    </div>
  );
}

function MapView({ locations, onOpen }) {
  return (
    <div className="h-[600px] w-full relative z-0">
      <MapContainer center={[MUMBAI_CENTER.lat, MUMBAI_CENTER.lng]} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc) => (
          <CircleMarker
            key={loc.id}
            center={[loc.lat, loc.lng]}
            radius={9}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: STATUS_DOT[loc.status] || STATUS_DOT.Limited, fillOpacity: 1 }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-gray-900">{loc.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{loc.total - loc.occupied}/{loc.total} available</p>
                <button onClick={() => onOpen(loc)} className="text-blue-600 text-xs font-medium mt-1.5 underline">View details</button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function ParkingFinder({ user }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [userLoc, setUserLoc] = useState(MUMBAI_CENTER);
  const [filters, setFilters] = useState({ availableOnly: false, maxPrice: 80, amenities: [] });

  const [rawData, setRawData] = useState([]);
  const [status, setStatus] = useState("loading");
  const [myCars, setMyCars] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const data = await trpc.list.query({
        search: query || undefined,
        availableOnly: filters.availableOnly || undefined,
        maxPrice: filters.maxPrice,
        amenities: filters.amenities.length ? filters.amenities : undefined,
      });
      setRawData(data);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [query, filters]);

  const fetchUserContext = useCallback(async () => {
    if (!user) return;
    try {
      const [cars, bookings] = await Promise.all([
        trpc.cars.list.query({ userId: user.id }),
        trpc.bookings.myActive.query({ userId: user.id }),
      ]);
      setMyCars(cars);
      setActiveBookings(bookings);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchUserContext(); }, [fetchUserContext]);

  useEffect(() => {
    const id = setInterval(() => { fetchData(); fetchUserContext(); }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData, fetchUserContext]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationNote("Geolocation not supported — using default Mumbai location.");
      setSortByDistance(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationNote("Sorted by distance from your location.");
        setSortByDistance(true);
      },
      () => {
        setUserLoc(MUMBAI_CENTER);
        setLocationNote("Location permission denied — using default Mumbai location.");
        setSortByDistance(true);
      }
    );
  };

  const handleSimulate = async (loc) => {
    const newAvailable = Math.max(0, Math.min(loc.total, Math.round(Math.random() * loc.total)));
    await trpc.updateAvailability.mutate({ id: loc.id, availableSlots: newAvailable });
    fetchData();
  };

  const handleBook = async (parkingLocationId, carId) => {
    await trpc.bookings.book.mutate({ userId: user.id, carId, parkingLocationId });
    await Promise.all([fetchData(), fetchUserContext()]);
  };

  const handleExit = async (bookingId) => {
    await trpc.bookings.exit.mutate({ bookingId });
    await Promise.all([fetchData(), fetchUserContext()]);
  };

  const results = useMemo(() => {
    let list = rawData.map((l) => ({ ...l, distance: haversineKm(userLoc, { lat: l.lat, lng: l.lng }) }));
    if (sortByDistance) list = [...list].sort((a, b) => a.distance - b.distance);
    return list;
  }, [rawData, userLoc, sortByDistance]);

  useEffect(() => {
    if (selected) {
      const fresh = results.find((l) => l.id === selected.id);
      if (fresh) setSelected(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white rounded-lg p-2"><MapPin size={20} /></div>
          <h1 className="text-xl font-bold text-gray-900">Parking Finder</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("map")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border ${view === "map" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}><MapIcon size={16} /> Map</button>
          <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border ${view === "list" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}><List size={16} /> List</button>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded-lg px-3.5 py-2.5 bg-white">
            <Search size={18} className="text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or address..." className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400" />
          </div>
          <button onClick={requestLocation} className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white"><Navigation size={16} /> Near me</button>
          <button onClick={() => setShowFilters((s) => !s)} className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 bg-white">Filters <ChevronDown size={16} /></button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-500">
            {status === "loading" ? "Loading..." : `${results.length} parking locations found`}
          </p>
          {locationNote && <p className="text-xs text-gray-400">{locationNote}</p>}
        </div>
      </div>

      {showFilters && <FiltersPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />}

      <div className="border-t border-gray-200" />

      {status === "error" ? (
        <div className="px-6 py-16 flex flex-col items-center text-center gap-3 text-gray-500">
          <AlertTriangle size={28} className="text-red-500" />
          <p className="text-sm font-medium text-gray-700">Couldn't reach the Parking Finder API</p>
          <p className="text-sm max-w-md">Make sure the backend server is running (npm run dev inside the server folder) on http://localhost:4000.</p>
          <button onClick={fetchData} className="text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50">Retry</button>
        </div>
      ) : status === "loading" ? (
        <div className="px-6 py-16 flex justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="px-6 py-16 text-center text-gray-400 text-sm">No parking locations match your filters.</div>
      ) : view === "list" ? (
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((loc) => <Card key={loc.id} loc={loc} onOpen={setSelected} />)}
        </div>
      ) : (
        <MapView locations={results} onOpen={setSelected} />
      )}

      <DetailModal
        loc={selected}
        onClose={() => setSelected(null)}
        onSimulate={handleSimulate}
        myCars={myCars}
        activeBookings={activeBookings}
        onBook={handleBook}
        onExit={handleExit}
      />
    </div>
  );
}
