/**
 * cPanel / GoDaddy Cron Job Queue Runner for DentalCore.
 * 
 * In shared hosting environments (such as GoDaddy cPanel with Phusion Passenger),
 * long-lived background timer loops (setInterval) can be suspended when the Node.js
 * web process goes idle.
 * 
 * Schedule this script via cPanel Cron Jobs (e.g., every 1 or 2 minutes):
 *   cd /home/username/public_html/server && /usr/local/bin/node dist/scripts/cronQueueRunner.js >> /home/username/cron.log 2>&1
 */

import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/db';
import { QueueRunner } from '../src/services/communication/queueRunner';

async function main() {
  const startTime = Date.now();
  console.log(`[CronQueueRunner] Invocation started at ${new Date().toISOString()}`);

  try {
    // 1. Recover stale in-flight jobs
    await QueueRunner.recoverStaleJobs();

    // 2. Schedule upcoming appointment reminders
    await QueueRunner.scheduleUpcomingAppointmentReminders();

    // 3. Drain pending notifications in batches (up to 10 batches = 50 notifications per cron run)
    let totalProcessed = 0;
    const maxBatches = 10;
    for (let i = 0; i < maxBatches; i++) {
      const processed = await QueueRunner.processBatch(5);
      totalProcessed += processed;
      if (processed === 0) {
        break; // No more queued notifications ready
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[CronQueueRunner] Invocation complete. Processed ${totalProcessed} notifications in ${durationMs}ms.`);
  } catch (err: any) {
    console.error(`[CronQueueRunner] Execution error:`, err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
