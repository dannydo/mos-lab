import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  const date = '2026-07-13';
  const store = 'De Tham';

  try {
    // 1. Fetch Roster
    const roster = await legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT staff_name, shift_start, shift_end, is_off 
       FROM wingsctrl_roster 
       WHERE roster_date = ? AND store = ? AND is_active = 1`,
      date,
      store
    );

    // 2. Fetch Appointments
    // Let's get all active appointments on this day
    const appointments = await legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT client_name, time_start, duration, status, specialist_name 
       FROM wingsctrl_appointments 
       WHERE store = ? AND DATE(time_start) = ? AND status != 'cancelled'`,
      store,
      date
    );

    console.log('--- Roster ---');
    roster.forEach((r) => {
      if (!r.is_off) {
        // Format time
        const start = new Date(r.shift_start).toISOString().split('T')[1].slice(0, 5);
        const end = new Date(r.shift_end).toISOString().split('T')[1].slice(0, 5);
        console.log(`${r.staff_name}: ${start} - ${end}`);
      }
    });

    console.log('\n--- Appointments ---');
    appointments.forEach((a) => {
      const time = new Date(a.time_start).toISOString().split('T')[1].slice(0, 8);
      console.log(`${a.client_name}: ${time} (Duration: ${a.duration}m), specialist: ${a.specialist_name}`);
    });

    // 3. Generate slots (09:00 to 20:00, every 15m)
    console.log('\n--- Calculated Slots ---');
    let current = new Date(`${date}T09:00:00Z`);
    const end = new Date(`${date}T20:15:00Z`);

    while (current < end) {
      const timeStr = current.toISOString().split('T')[1].slice(0, 5);

      // Calculate roster count active at this time
      const activeRoster = roster.filter((r) => {
        if (r.is_off) return false;
        const rStart = new Date(r.shift_start).toISOString().split('T')[1].slice(0, 5);
        const rEnd = new Date(r.shift_end).toISOString().split('T')[1].slice(0, 5);
        return rStart <= timeStr && timeStr < rEnd;
      });

      // Calculate active appointments at this time
      const activeAppointments = appointments.filter((a) => {
        const aStartStr = new Date(a.time_start).toISOString().split('T')[1].slice(0, 5);
        // calculate end time string
        const aStart = new Date(a.time_start);
        const aEnd = new Date(aStart.getTime() + a.duration * 60000);
        const aEndStr = aEnd.toISOString().split('T')[1].slice(0, 5);

        // Handle overlaps
        return aStartStr <= timeStr && timeStr < aEndStr;
      });

      const rosterCount = activeRoster.length;
      const bookedCount = activeAppointments.length;
      const available = rosterCount - bookedCount;

      console.log(`${timeStr} -> Roster: ${rosterCount}, Booked: ${bookedCount}, Available: ${available}`);

      // Advance by 15 mins
      current = new Date(current.getTime() + 15 * 60000);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

run().catch(console.error);
