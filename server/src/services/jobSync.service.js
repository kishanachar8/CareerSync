import Job from '../models/Job.js';
import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import { searchIndeed } from '../providers/indeed.provider.js';
import { searchAdzuna } from '../providers/adzuna.provider.js';
import { searchJooble } from '../providers/jooble.provider.js';
import { searchReed } from '../providers/reed.provider.js';
import { searchLinkedIn } from '../providers/linkedin.provider.js';
import { searchArbeitnow } from '../providers/arbeitnow.provider.js';
import { searchFindwork } from '../providers/findwork.provider.js';
import { searchJobicy } from '../providers/jobicy.provider.js';
import { searchRemoteOK } from '../providers/remoteok.provider.js';
import { searchTheMuse } from '../providers/themuse.provider.js';

const SYNC_CACHE_TTL = 30 * 60; // 30 minutes

function syncCacheKey(keywords, location) {
  const k = keywords.toLowerCase().replace(/\s+/g, '_').slice(0, 60);
  const l = (location || '').toLowerCase().replace(/\s+/g, '_').slice(0, 30);
  return `job:sync:${k}:${l}`;
}

// Most providers only return a short description snippet and never report
// experience requirements (only the Naukri/Foundit scrapers extract that
// from the listing card). Recover a rough range from common phrasing in the
// description text instead of leaving every API-sourced job at "0+ yrs".
function extractExperience(text = '') {
  if (!text) return null;
  const range = text.match(/(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\+?\s*years?/i);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const plus = text.match(/(\d{1,2})\+\s*years?/i);
  if (plus) return { min: Number(plus[1]) };
  const min = text.match(/(?:minimum|at least|min\.?)\s*(\d{1,2})\s*years?/i);
  if (min) return { min: Number(min[1]) };
  return null;
}

async function upsertJobs(jobs) {
  const valid = jobs.filter(j => j.title && j.source && j.externalId);
  if (!valid.length) return 0;

  const ops = valid.map(job => {
    if (!job.experienceRequired?.min && !job.experienceRequired?.max) {
      const inferred = extractExperience(job.description);
      if (inferred) job.experienceRequired = inferred;
    }
    return {
      updateOne: {
        filter: { source: job.source, externalId: job.externalId },
        update: { $set: job },
        upsert: true,
      },
    };
  });

  const result = await Job.bulkWrite(ops, { ordered: false });
  return (result.upsertedCount || 0) + (result.modifiedCount || 0);
}

/**
 * Sync jobs from all configured providers for the given keyword.
 * Providers that need an API key (Adzuna, Jooble, Reed, Findwork) no-op
 * gracefully when unconfigured, so it's safe to always call all of them.
 * Naukri jobs are populated separately via the automation bot.
 */
export const syncJobsFromProviders = async ({ keywords, location = '', forceSync = false }) => {
  const key = syncCacheKey(keywords, location);

  if (!forceSync) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) return { skipped: true };
  }

  const params = { keywords, location: location || 'India' };

  const results = await Promise.allSettled([
    searchIndeed(params),
    searchAdzuna(params),
    searchJooble(params),
    searchReed(params),
    searchLinkedIn(params),
    searchArbeitnow(params),
    searchFindwork(params),
    searchJobicy(params),
    searchRemoteOK(params),
    searchTheMuse(params),
  ]);

  const all = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  const saved = await upsertJobs(all);

  await redis.set(key, '1', 'EX', SYNC_CACHE_TTL).catch(() => {});

  logger.info(`[JobSync] "${keywords}": ${all.length} fetched across ${results.length} providers, ${saved} upserted`);

  return { fetched: all.length, saved };
};
