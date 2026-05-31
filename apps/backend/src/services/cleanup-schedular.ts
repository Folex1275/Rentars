import { syncAllBookings, syncAllProperties } from './sync.service.js';

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runSync(): Promise<void> {
  const propertiesResult = await syncAllProperties();
  if (propertiesResult.success) {
    console.log(
      `[sync] Properties: ${propertiesResult.data?.synced} synced, ${propertiesResult.data?.failed} failed`,
    );
  } else {
    console.error(`[sync] Property sync failed: ${propertiesResult.error}`);
  }

  const bookingsResult = await syncAllBookings();
  if (bookingsResult.success) {
    console.log(
      `[sync] Bookings: ${bookingsResult.data?.synced} synced, ${bookingsResult.data?.failed} failed`,
    );
  } else {
    console.error(`[sync] Booking sync failed: ${bookingsResult.error}`);
  }
}

export function startSyncScheduler(): void {
  setInterval(() => {
    runSync().catch((err) => console.error('[sync] Scheduler error:', err));
  }, SYNC_INTERVAL_MS);

  console.log(`[sync] Scheduler started — interval: ${SYNC_INTERVAL_MS / 1000}s`);
}
