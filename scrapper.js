import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://yodesionline.net/';   // easiest mirror right now (Feb 2026)

async function scrape() {
  console.log('🚀 Starting daily Desi Serials scraper...');

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 90000 });

    // Scrape all latest episode links (works on current site structure)
    const rawEpisodes = await page.$$eval('a[href*="episode"], h2 a, h3 a, .entry-title a', links => 
      links.map(a => ({
        fullTitle: a.textContent.trim(),
        url: a.href
      })).filter(item => 
        item.fullTitle.includes('2026') || 
        item.fullTitle.includes('Episode') || 
        item.fullTitle.includes('February')
      )
    );

    console.log(`Found ${rawEpisodes.length} episodes`);

    const data = {};

    rawEpisodes.forEach(ep => {
      // Extract series name (e.g. "Yeh Rishta Kya Kehlata Hai" from full title)
      let series = ep.fullTitle.split('–')[0].split('Video')[0].split('Full')[0].trim();
      if (series.length < 5) series = "Other Serials";

      if (!data[series]) {
        data[series] = { name: series, episodes: [] };
      }

      // Extract date
      const dateMatch = ep.fullTitle.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
      const date = dateMatch ? dateMatch[1] : '2026-02-23';

      data[series].episodes.push({
        title: ep.fullTitle,
        date: date,
        sources: [ep.url]   // opens the actual episode page (multiple servers available there)
      });
    });

    // Sort episodes newest at bottom
    Object.keys(data).forEach(key => {
      data[key].episodes.sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    const finalData = { "Popular Channels": Object.values(data) };

    fs.writeFileSync('data.json', JSON.stringify(finalData, null, 2));
    console.log('✅ data.json UPDATED with ' + Object.keys(data).length + ' serials');

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await browser.close();
  }
}

scrape();
