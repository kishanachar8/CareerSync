/**
 * Public surface of the qa/ module.
 * Import everything you need from here; don't reach into sub-files directly.
 *
 * Quick-start:
 *
 *   import pg                              from 'pg';
 *   import { createTable }                 from './qa/index.js';
 *   import { handleScreeningQuestions,
 *            makePauseResolver }           from './qa/index.js';
 *
 *   const db = new pg.Pool({ connectionString: process.env.PG_URI });
 *   await createTable(db);    // run once on startup
 *
 *   // inside handleNaukriModal(), after fillKnownFields():
 *   const { filled, newlyCaptured, unfilled, safeToSubmit } =
 *     await handleScreeningQuestions(page, userId, {
 *       db,
 *       resolveNewAnswer: makePauseResolver(page, 8_000),
 *       skipLabels: ['notice period', 'current ctc', 'expected ctc',
 *                   'relevant experience', 'total experience', 'location'],
 *     });
 *
 *   if (!safeToSubmit) {
 *     // required fields have no answer — do not submit
 *     return { result: 'skipped', message: 'Unanswered required screening questions', newFields: {} };
 *   }
 */

export { encrypt, decrypt }                       from './encrypt.js';
export { createTable, hashQuestion,
         findByHash, findAll,
         upsertAnswer, deleteAnswer }              from './db.js';
export { normalize, hashNormalized, findMatch }   from './normalize.js';
export { CONFIG, scrapeQuestions, fillField }     from './scraper.js';
export { handleScreeningQuestions,
         makePauseResolver, makeLlmResolver }     from './orchestrator.js';
// MongoDB-native service (preferred over PostgreSQL db adapter)
export { loadAll, saveAnswer, incrementUsage,
         validateAnswer, findAnswer }             from './qaService.js';
