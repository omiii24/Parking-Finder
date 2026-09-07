import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";

export const parkingLocations = sqliteTable("parking_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  totalSlots: integer("total_slots").notNull(),
  availableSlots: integer("available_slots").notNull(),
  hourlyRate: integer("hourly_rate").notNull(),
  dailyRate: integer("daily_rate").notNull(),
  operatingHours: text("operating_hours").notNull(),
  amenities: text("amenities").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
});

export const cars = sqliteTable("cars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  carNumber: text("car_number").notNull(),
  createdAt: text("created_at").notNull(),
});

export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  carId: integer("car_id").notNull(),
  parkingLocationId: integer("parking_location_id").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  checkedOutAt: text("checked_out_at"),
});