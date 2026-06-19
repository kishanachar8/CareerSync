import Job from '../models/Job.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { searchIndeed } from '../providers/indeed.provider.js';

const SYNC_CACHE_TTL = 30 * 60; // 30 minutes

function syncCacheKey(keywords, location) {
  const k = keywords.toLowerCase().replace(/\s+/g, '_').slice(0, 60);
  const l = (location || '').toLowerCase().replace(/\s+/g, '_').slice(0, 30);
  return `job:sync:${k}:${l}`;
}

async function upsertJobs(jobs) {
  const valid = jobs.filter(j => j.title && j.source && j.externalId);
  if (!valid.length) return 0;

  const ops = valid.map(job => ({
    updateOne: {
      filter: { source: job.source, externalId: job.externalId },
      update: { $set: job },
      upsert: true,
    },
  }));

  const result = await Job.bulkWrite(ops, { ordered: false });
  return (result.upsertedCount || 0) + (result.modifiedCount || 0);
}

/**
 * Sync jobs from Indeed for the given keyword.
 * Naukri jobs are populated separately via the automation bot.
 */
export const syncJobsFromProviders = async ({ keywords, location = '', forceSync = false }) => {
  const key = syncCacheKey(keywords, location);

  if (!forceSync) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) return { skipped: true };
  }

  const results = await Promise.allSettled([
    searchIndeed({ keywords, location: location || 'India' }),
  ]);

  const all = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  const saved = await upsertJobs(all);

  await redis.set(key, '1', 'EX', SYNC_CACHE_TTL).catch(() => {});

  logger.info(`[JobSync] "${keywords}": ${all.length} fetched from Indeed, ${saved} upserted`);

  return { fetched: all.length, saved };
};
