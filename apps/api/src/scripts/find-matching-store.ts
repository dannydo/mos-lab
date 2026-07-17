import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  const dates = ['2026-07-12', '2026-07-13'];
  const stores = [
    { apptStore: 'De Tham', rosterStore: 'De Tham' },
    { apptStore: 'Estella Place', rosterStore: 'Estella' },
    { apptStore: 'PXL', rosterStore: 'PXL' },
  ];

  try {
    for (const date of dates) {
      for (const { apptStore, rosterStore } of stores) {
        console.log(`\n=================== Appt: ${apptStore} (Roster: ${rosterStore}) ON ${date} ===================`);

        // 1. Fetch Roster
        const roster = await legacy.$queryRawUnsafe<any[]>(
          `SELECT staff_name, shift_start, shift_end, is_off 
           FROM wingsctrl_roster 
           WHERE roster_date = ? AND store = ? AND is_active = 1`,
          date,
          rosterStore
        );

        // 2. Fetch Appointments
        const appointments = await legacy.$queryRawUnsafe<any[]>(
          `SELECT client_name, time_start, duration, status, specialist_name 
           FROM wingsctrl_appointments 
           WHERE store = ? AND DATE(time_start) = ? AND status != 'cancelled'`,
          apptStore,
          date
        );

        // Calculate for 09:00, 10:00, 11:00
        const times = ['09:00', '10:00', '11:00'];
        for (const timeStr of times) {
          const activeRoster = roster.filter((r) => {
            if (r.is_off) return false;
            const rStart = new Date(r.shift_start).toISOString().split('T')[1].slice(0, 5);
            const rEnd = new Date(r.shift_end).toISOString().split('T')[1].slice(0, 5);
            return rStart <= timeStr && timeStr < rEnd;
          });

          const activeAppointments = appointments.filter((a) => {
            const aStartStr = new Date(a.time_start).toISOString().split('T')[1].slice(0, 5);
            const aStart = new Date(a.time_start);
            const aEnd = new Date(aStart.getTime() + a.duration * 60000);
            const aEndStr = aEnd.toISOString().split('T')[1].slice(0, 5);
            return aStartStr <= timeStr && timeStr < aEndStr;
          });

          const rosterCount = activeRoster.length;
          const bookedCount = activeAppointments.length;
          const available = rosterCount - bookedCount;

          console.log(`${timeStr} -> Roster: ${rosterCount}, Booked: ${bookedCount}, Available: ${available}`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

run().catch(console.error);
