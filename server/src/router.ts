import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure } from "./trpc";
import { db } from "./db/client";
import { parkingLocations, users, cars, bookings } from "./db/schema";

function mapRow(row: typeof parkingLocations.$inferSelect) {
  const pctAvailable = row.availableSlots / row.totalSlots;
  const status = row.availableSlots === 0 ? "Full" : pctAvailable < 0.3 ? "Limited" : "Available";
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    total: row.totalSlots,
    occupied: row.totalSlots - row.availableSlots,
    hourly: row.hourlyRate,
    daily: row.dailyRate,
    hours: row.operatingHours,
    amenities: JSON.parse(row.amenities) as string[],
    status,
    updatedAt: row.updatedAt,
  };
}

const filterInput = z
  .object({
    search: z.string().optional(),
    availableOnly: z.boolean().optional(),
    maxPrice: z.number().optional(),
    amenities: z.array(z.string()).optional(),
  })
  .optional();

const authRouter = router({
  login: publicProcedure.input(z.object({ name: z.string().min(1) })).mutation(({ input }) => {
    const trimmed = input.name.trim();
    let user = db.select().from(users).where(eq(users.name, trimmed)).get();
    if (!user) {
      db.insert(users).values({ name: trimmed, createdAt: new Date().toISOString() }).run();
      user = db.select().from(users).where(eq(users.name, trimmed)).get();
    }
    return user;
  }),
});

const carsRouter = router({
  list: publicProcedure.input(z.object({ userId: z.number() })).query(({ input }) => {
    return db.select().from(cars).where(eq(cars.userId, input.userId)).all();
  }),

  add: publicProcedure
    .input(z.object({ userId: z.number(), brand: z.string().min(1), model: z.string().min(1), carNumber: z.string().min(1) }))
    .mutation(({ input }) => {
      db.insert(cars)
        .values({ ...input, createdAt: new Date().toISOString() })
        .run();
      return db.select().from(cars).where(eq(cars.userId, input.userId)).all();
    }),

  update: publicProcedure
    .input(z.object({ id: z.number(), brand: z.string().min(1), model: z.string().min(1), carNumber: z.string().min(1) }))
    .mutation(({ input }) => {
      db.update(cars)
        .set({ brand: input.brand, model: input.model, carNumber: input.carNumber })
        .where(eq(cars.id, input.id))
        .run();
      return db.select().from(cars).where(eq(cars.id, input.id)).get();
    }),

  delete: publicProcedure.input(z.object({ id: z.number(), userId: z.number() })).mutation(({ input }) => {
    db.delete(cars).where(eq(cars.id, input.id)).run();
    return db.select().from(cars).where(eq(cars.userId, input.userId)).all();
  }),
});

const bookingsRouter = router({
  myActive: publicProcedure.input(z.object({ userId: z.number() })).query(({ input }) => {
    const rows = db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, input.userId), eq(bookings.status, "active")))
      .all();

    return rows.map((b) => {
      const car = db.select().from(cars).where(eq(cars.id, b.carId)).get();
      const loc = db.select().from(parkingLocations).where(eq(parkingLocations.id, b.parkingLocationId)).get();
      return {
        bookingId: b.id,
        carId: b.carId,
        carLabel: car ? `${car.brand} ${car.model} (${car.carNumber})` : "Unknown car",
        parkingLocationId: b.parkingLocationId,
        parkingName: loc ? loc.name : "Unknown location",
        createdAt: b.createdAt,
      };
    });
  }),

  book: publicProcedure
    .input(z.object({ userId: z.number(), carId: z.number(), parkingLocationId: z.number() }))
    .mutation(({ input }) => {
      const loc = db.select().from(parkingLocations).where(eq(parkingLocations.id, input.parkingLocationId)).get();
      if (!loc) throw new Error("Parking location not found");
      if (loc.availableSlots <= 0) throw new Error("No slots available at this location");

      db.update(parkingLocations)
        .set({ availableSlots: loc.availableSlots - 1, updatedAt: new Date().toISOString() })
        .where(eq(parkingLocations.id, input.parkingLocationId))
        .run();

      db.insert(bookings)
        .values({
          userId: input.userId,
          carId: input.carId,
          parkingLocationId: input.parkingLocationId,
          status: "active",
          createdAt: new Date().toISOString(),
          checkedOutAt: null,
        })
        .run();

      const updatedLoc = db.select().from(parkingLocations).where(eq(parkingLocations.id, input.parkingLocationId)).get();
      return updatedLoc ? mapRow(updatedLoc) : null;
    }),

  exit: publicProcedure.input(z.object({ bookingId: z.number() })).mutation(({ input }) => {
    const booking = db.select().from(bookings).where(eq(bookings.id, input.bookingId)).get();
    if (!booking || booking.status !== "active") throw new Error("Active booking not found");

    const loc = db.select().from(parkingLocations).where(eq(parkingLocations.id, booking.parkingLocationId)).get();
    if (loc) {
      const newAvailable = Math.min(loc.totalSlots, loc.availableSlots + 1);
      db.update(parkingLocations)
        .set({ availableSlots: newAvailable, updatedAt: new Date().toISOString() })
        .where(eq(parkingLocations.id, booking.parkingLocationId))
        .run();
    }

    db.update(bookings)
      .set({ status: "completed", checkedOutAt: new Date().toISOString() })
      .where(eq(bookings.id, input.bookingId))
      .run();

    return { success: true };
  }),
});

export const appRouter = router({
  list: publicProcedure.input(filterInput).query(({ input }) => {
    const rows = db.select().from(parkingLocations).all();
    let list = rows.map(mapRow);

    const q = input?.search?.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
      );
    }
    if (input?.availableOnly) {
      list = list.filter((l) => l.total - l.occupied > 0);
    }
    if (typeof input?.maxPrice === "number") {
      list = list.filter((l) => l.hourly <= input.maxPrice!);
    }
    if (input?.amenities?.length) {
      list = list.filter((l) => input.amenities!.every((a) => l.amenities.includes(a)));
    }
    return list;
  }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => {
    const row = db.select().from(parkingLocations).where(eq(parkingLocations.id, input.id)).get();
    return row ? mapRow(row) : null;
  }),

  updateAvailability: publicProcedure
    .input(z.object({ id: z.number(), availableSlots: z.number().min(0) }))
    .mutation(({ input }) => {
      db.update(parkingLocations)
        .set({ availableSlots: input.availableSlots, updatedAt: new Date().toISOString() })
        .where(eq(parkingLocations.id, input.id))
        .run();
      const row = db.select().from(parkingLocations).where(eq(parkingLocations.id, input.id)).get();
      return row ? mapRow(row) : null;
    }),

  auth: authRouter,
  cars: carsRouter,
  bookings: bookingsRouter,
});

export type AppRouter = typeof appRouter;