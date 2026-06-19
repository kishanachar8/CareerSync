import logger from '../utils/logger.js';

const BASE = 'https://in.indeed.com/rss';

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTag(block, tag) {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  return plain ? plain[1].trim() : '';
}

function parseTitle(raw) {
  const dash = raw.lastIndexOf(' - ');
  if (dash > 0) return { title: raw.slice(0, dash).trim(), company: raw.slice(dash + 3).trim() };
  const at = raw.lastIndexOf(' at ');
  if (at > 0) return { title: raw.slice(0, at).trim(), company: raw.slice(at + 4).trim() };
  return { title: raw, company: '' };
}

function parseLocation(description) {
  const m =
    description.match(/location\s*:\s*<\/b>\s*([^<]{2,80})/i) ||
    description.match(/<b>location<\/b>\s*:?\s*([^<]{2,80})/i) ||
    description.match(/location:\s*([A-Z][^<\n,]{2,60}(?:,\s*[A-Z][^<\n]{2,40})?)/i);
  return m ? m[1].replace(/&[a-z]+;/g, ' ').replace(/<[^>]+>/g, '').trim() : '';
}

function parseItems(xml, fallbackLocation = '') {
  const jobs = [];
  const blocks = xml.split(/<item>/i).slice(1);

  for (const block of blocks) {
    const rawTitle = getTag(block, 'title');
    if (!rawTitle) continue;

    const { title, company: parsedCompany } = parseTitle(rawTitle);

    const srcMatch = block.match(/<source[^>]*>([^<]+)<\/source>/i);
    const company = (srcMatch ? srcMatch[1].trim() : parsedCompany) || 'Unknown';

    const guid = getTag(block, 'guid');
    const link = getTag(block, 'link') || guid;
    if (!link || !title) continue;

    const idMatch = link.match(/jk=([a-f0-9]{16})/i);
    const externalId = idMatch ? idMatch[1] : (guid || link);

    const description = getTag(block, 'description');
    // Use parsed location, or fall back to the search location (e.g. 'Remote')
    const location = parseLocation(description) || fallbackLocation;

    const pubDate = getTag(block, 'pubDate');

    jobs.push({
      title,
      company,
      location,
      source: 'indeed',
      externalId,
      applyUrl: link,
      description: stripHtml(description).slice(0, 600),
      postedAt: pubDate ? new Date(pubDate) : new Date(),
      isActive: true,
      employmentType: 'full-time',
      skills: [],
    });
  }

  return jobs;
}

async function fetchRSS(keywords, location, fallbackLocation = '') {
  const params = new URLSearchParams({
    q: keywords,
    l: location,
    sort: 'date',
    limit: '25',
    fromage: '30',
  });

  try {
    const res = await fetch(`${BASE}?${params}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      logger.warn(`[Indeed] RSS (${location}) returned ${res.status}`);
      return [];
    }

    const xml = await res.text();
    if (!xml || !xml.includes('<item>')) return [];

    return parseItems(xml, fallbackLocation);
  } catch (err) {
    logger.warn(`[Indeed] Fetch (${location}) failed: ${err.message}`);
    return [];
  }
}

export const searchIndeed = async ({ keywords }) => {
  // Fetch India jobs and Remote jobs in parallel
  const [indiaRes, remoteRes] = await Promise.allSettled([
    fetchRSS(keywords, 'India', 'India'),
    fetchRSS(keywords, 'Remote', 'Remote'),
  ]);

  const indiaJobs  = indiaRes.status  === 'fulfilled' ? indiaRes.value  : [];
  const remoteJobs = remoteRes.status === 'fulfilled' ? remoteRes.value : [];

  // Deduplicate by externalId (same job can appear in both searches)
  const seen = new Set();
  const all = [];
  for (const job of [...indiaJobs, ...remoteJobs]) {
    if (!seen.has(job.externalId)) {
      seen.add(job.externalId);
      all.push(job);
    }
  }

  logger.info(
    `[Indeed] "${keywords}": ${indiaJobs.length} India + ${remoteJobs.length} Remote = ${all.length} unique`,
  );
  return all;
};
