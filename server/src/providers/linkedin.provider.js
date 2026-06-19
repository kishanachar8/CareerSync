import logger from '../utils/logger.js';

const GUEST_API = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
}

function extractFirst(html, pattern) {
  const m = html.match(pattern);
  return m ? decodeEntities(m[1]) : null;
}

function parseHtml(html) {
  const jobs = [];
  // Each job is wrapped in a <li> element
  const blocks = html.split(/<\/li>/i);

  for (const block of blocks) {
    const idMatch = block.match(/\/jobs\/view\/(\d+)/);
    if (!idMatch) continue;
    const externalId = idMatch[1];

    const urlMatch = block.match(/href="(https:\/\/[^"]*\/jobs\/view\/\d+[^"]*)"/);
    const applyUrl = urlMatch
      ? urlMatch[1].replace(/&amp;/g, '&')
      : `https://www.linkedin.com/jobs/view/${externalId}/`;

    const title = extractFirst(block, /class="base-search-card__title"[^>]*>\s*([^<]+?)\s*</);
    if (!title) continue;

    // Company is in the nested anchor inside the h4
    const company =
      extractFirst(block, /class="hidden-nested-link"[^>]*>\s*([^<]+?)\s*</) ||
      extractFirst(block, /class="base-search-card__subtitle"[^>]*>[\s\S]*?<a[^>]*>\s*([^<]+?)\s*</) ||
      'Unknown';

    const location = extractFirst(block, /class="job-search-card__location"[^>]*>\s*([^<]+?)\s*</) || 'India';

    const dateMatch = block.match(/datetime="([^"]+)"/);
    const postedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

    jobs.push({
      title,
      company,
      location,
      source: 'linkedin',
      externalId,
      applyUrl,
      postedAt: isNaN(postedAt) ? new Date() : postedAt,
      isActive: true,
      employmentType: 'full-time',
      skills: [],
      description: '',
    });
  }

  return jobs;
}

export const searchLinkedIn = async ({ keywords, location = 'India' }) => {
  const params = new URLSearchParams({ keywords, location, start: '0' });
  const url = `${GUEST_API}?${params}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.linkedin.com/jobs/',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      logger.warn(`[LinkedIn] Guest API returned ${res.status} — skipping`);
      return [];
    }

    const html = await res.text();
    if (!html || html.length < 100 || html.includes('<title>LinkedIn Login')) {
      logger.warn('[LinkedIn] Guest API returned login page or empty response — skipping');
      return [];
    }

    const jobs = parseHtml(html);
    logger.info(`[LinkedIn] Parsed ${jobs.length} jobs for "${keywords}"`);
    return jobs;
  } catch (err) {
    logger.warn(`[LinkedIn] Fetch failed: ${err.message}`);
    return [];
  }
};
