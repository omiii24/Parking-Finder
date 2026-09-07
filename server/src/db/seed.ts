import { sqlite, db } from "./client";
import { parkingLocations, users, cars, bookings } from "./schema";

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS parking_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    total_slots INTEGER NOT NULL,
    available_slots INTEGER NOT NULL,
    hourly_rate INTEGER NOT NULL,
    daily_rate INTEGER NOT NULL,
    operating_hours TEXT NOT NULL,
    amenities TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    car_number TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    car_id INTEGER NOT NULL,
    parking_location_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    checked_out_at TEXT
  );
`);

const existing = db.select().from(parkingLocations).all();

if (existing.length === 0) {
  const now = new Date().toISOString();
  const seedData = [
    { name: "Bandra Kurla Complex Parking", address: "G Block, BKC, Bandra East", lat: 19.0669, lng: 72.8679, totalSlots: 150, availableSlots: 45, hourlyRate: 60, dailyRate: 350, operatingHours: "06:00 - 23:00", amenities: JSON.stringify(["CCTV", "EV Charging", "Covered"]), updatedAt: now },
    { name: "CST Station Garage", address: "Chhatrapati Shivaji Terminus, Fort", lat: 18.9398, lng: 72.8355, totalSlots: 200, availableSlots: 78, hourlyRate: 40, dailyRate: 250, operatingHours: "05:00 - 00:00", amenities: JSON.stringify(["CCTV", "Wheelchair Accessible", "Valet Service"]), updatedAt: now },
    { name: "Phoenix Marketcity Parking", address: "LBS Marg, Kurla West", lat: 19.0863, lng: 72.8891, totalSlots: 300, availableSlots: 156, hourlyRate: 30, dailyRate: 200, operatingHours: "07:00 - 22:00", amenities: JSON.stringify(["Free WiFi", "Covered", "Wheelchair Accessible"]), updatedAt: now },
    { name: "IIT Bombay Campus Lot", address: "Main Gate Road, Powai", lat: 19.1334, lng: 72.9133, totalSlots: 400, availableSlots: 234, hourlyRate: 20, dailyRate: 120, operatingHours: "06:00 - 23:00", amenities: JSON.stringify(["Wheelchair Accessible", "Covered"]), updatedAt: now },
    { name: "Andheri Metro Garage", address: "Western Express Highway, Andheri East", lat: 19.1197, lng: 72.8697, totalSlots: 250, availableSlots: 89, hourlyRate: 45, dailyRate: 280, operatingHours: "06:00 - 22:00", amenities: JSON.stringify(["CCTV", "EV Charging", "Covered"]), updatedAt: now },
    { name: "Lilavati Hospital Garage", address: "A-791, Bandra Reclamation, Bandra West", lat: 19.0509, lng: 72.8295, totalSlots: 220, availableSlots: 45, hourlyRate: 35, dailyRate: 220, operatingHours: "00:00 - 23:59", amenities: JSON.stringify(["CCTV", "Wheelchair Accessible", "Covered"]), updatedAt: now },
    { name: "Juhu Beach Parking", address: "Juhu Tara Road, Juhu", lat: 19.1075, lng: 72.8263, totalSlots: 180, availableSlots: 110, hourlyRate: 25, dailyRate: 150, operatingHours: "06:00 - 23:00", amenities: JSON.stringify(["CCTV", "Covered"]), updatedAt: now },
    { name: "Nariman Point Financial Garage", address: "Marine Drive, Nariman Point", lat: 18.9256, lng: 72.8242, totalSlots: 260, availableSlots: 29, hourlyRate: 70, dailyRate: 450, operatingHours: "06:00 - 22:00", amenities: JSON.stringify(["CCTV", "EV Charging", "Valet Service"]), updatedAt: now },
  ];

  for (const loc of seedData) {
    db.insert(parkingLocations).values(loc).run();
  }
  console.log(`Seeded ${seedData.length} parking locations (dev/demo data).`);
}