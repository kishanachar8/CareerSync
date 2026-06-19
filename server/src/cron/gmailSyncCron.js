/**
 * Periodic Gmail sync cron — runs every 30 minutes for all users who have
 * connected their Gmail account.
 *
 * Uses BullMQ's built-in repeat/cron support (already a project dependency)
 * so no extra packages are needed.  The queue is backed by the same Redis
 * instance used by all other workers.
 *
 * Polling interval vs. Gmail Push Notifications:
 *   Push notifications (via Gmail API watch + Pub/Sub) deliver updates in
 *   real-time but require a publicly accessible HTTPS endpoint and a Google
 *   Cloud Pub/Sub topic.  For a development/MVP setup, 30-minute polling is
 *   simpler and sufficient.  To migrate to push notifications later:
 *     1. Call gmail.users.watch({ userId:'me', topicName:'projects/…' })
 *     2. Create a POST /api/v1/gmail/push-notification route
 *     3. That route verifies the Pub/Sub JWT and calls syncGmailEmails(userId)
 *     4. Remove or lengthen this cron interval
 */

import { Queue, Worker } from 'bullmq';
import redis              from '../config/redis.js';
import GmailToken         from '../models/GmailToken.js';
import { syncGmailEmails } from '../modules/gmail/gmail.service.js';
import logger             from '../utils/logger.js';

const QUEUE_NAME      = 'gmail-sync-cron';
const SYNC_EVERY_MS   = 30 * 60 * 1_000;   // 30 minutes
const JOB_NAME        = 'sync-all-users';

let _queue  = null;
let _worker = null;

export async function startGmailSyncCron() {
  _queue = new Queue(QUEUE_NAME, {
    connection:     redis,
    defaultJobOptions: {
      removeOnComplete: 5,
      removeOnFail:     10,
    },
  });

  // Idempotent: BullMQ deduplicates jobs with the same repeat key
  await _queue.add(JOB_NAME, {}, {
    repeat:   { every: SYNC_EVERY_MS },
    jobId:    JOB_NAME,   // stable ID prevents duplicate repeating jobs on restart
  });

  _worker = new Worker(
    QUEUE_NAME,
    async () => {
      const tokens = await GmailToken.find({}, 'userId').lean();
      if (!tokens.length) return;

      logger.info(`[GmailCron] Syncing ${tokens.length} connected account(s)`);

      const results = await Promise.allSettled(
        tokens.map(({ userId }) =>
          syncGmailEmails(userId).catch((err) => {
            // Log per-user failures without aborting the whole cycle
            logger.warn(`[GmailCron] User ${userId} sync failed: ${err.message}`);
          }),
        ),
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      logger.info(`[GmailCron] Cycle complete — ${succeeded}/${tokens.length} synced`);
    },
    { connection: redis, concurrency: 1 },
  );

  _worker.on('failed', (job, err) =>
    logger.error(`[GmailCron] Worker job failed: ${err.message}`),
  );

  logger.info(`[GmailCron] Started — syncing every ${SYNC_EVERY_MS / 60_000} min`);
}

export async function stopGmailSyncCron() {
  await Promise.allSettled([
    _worker?.close(),
    _queue?.close(),
  ]);
}
