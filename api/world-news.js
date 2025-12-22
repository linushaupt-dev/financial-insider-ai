const https = require('https');

const COUNTRY_ALIASES = {
  'United States': ['USA', 'U.S.', 'US', 'America', 'American', 'Washington', 'Biden', 'Trump', 'Congress', 'White House', 'Pentagon'],
  'United Kingdom': ['UK', 'Britain', 'British', 'England', 'London', 'Parliament'],
  'Russia': ['Russian', 'Moscow', 'Putin', 'Kremlin'],
  'China': ['Chinese', 'Beijing', 'Xi Jinping'],
  'Germany': ['German', 'Berlin', 'Scholz'],
  'France': ['French', 'Paris', 'Macron'],
  'Israel': ['Israeli', 'Tel Aviv', 'Jerusalem', 'Netanyahu', 'Gaza', 'Hamas', 'IDF'],
  'Ukraine': ['Ukrainian', 'Kyiv', 'Zelensky'],
  'Syria': ['Syrian', 'Damascus', 'Assad'],
  'Canada': ['Canadian', 'Ottawa', 'Trudeau', 'Freeland'],
  'Italy': ['Italian', 'Rome', 'Milan', 'Meloni'],
  'Japan': ['Japanese', 'Tokyo'],
  'India': ['Indian', 'Delhi', 'Modi', 'Mumbai'],
  'Australia': ['Australian', 'Sydney', 'Melbourne', 'Canberra'],
  'Brazil': ['Brazilian', 'Brasilia', 'Lula'],
  'Mexico': ['Mexican', 'Mexico City'],
  'South Korea': ['Korean', 'Seoul', 'Korea'],
  'Iran': ['Iranian', 'Tehran'],
  'Turkey': ['Turkish', 'Ankara', 'Istanbul', 'Erdogan'],
  'Saudi Arabia': ['Saudi', 'Riyadh'],
  'Egypt': ['Egyptian', 'Cairo'],
  'Poland': ['Polish', 'Warsaw'],
  'Netherlands': ['Dutch', 'Amsterdam', 'Holland'],
  'Spain': ['Spanish', 'Madrid', 'Barcelona'],
  'Argentina': ['Argentine', 'Buenos Aires', 'Milei'],
  'Ireland': ['Irish', 'Dublin'],
  'Georgia': ['Georgian', 'Tbilisi']
};

const NEWS_FEEDS = [
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'https://feeds.npr.org/1004/rss.xml'
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml, source) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || '';
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
    const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim() || '';
    
    if (title) {
      items.push({ title, link, pubDate, description, source });
    }
  }
  return items;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const interval = seconds / 3600;
  if (interval > 24) return Math.floor(interval / 24) + ' days ago';
  if (interval > 1) return Math.floor(interval) + ' hr ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes > 1) return minutes + ' min ago';
  return 'Just now';
}

function articleMatchesCountry(article, country) {
  const text = (article.title + ' ' + article.description).toLowerCase();
  if (text.includes(country.toLowerCase())) return true;
  
  const aliases = COUNTRY_ALIASES[country] || [];
  for (const alias of aliases) {
    if (text.includes(alias.toLowerCase())) return true;
  }
  return false;
}

function getSourceName(url) {
  if (url.includes('bbc')) return 'BBC World';
  if (url.includes('nytimes')) return 'NY Times';
  if (url.includes('npr')) return 'NPR';
  return 'News';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const country = req.query.country;
  
  if (!country) {
    return res.status(400).json({ error: 'Country parameter is required' });
  }
  
  try {
    const allItems = [];
    
    for (const feedUrl of NEWS_FEEDS) {
      try {
        const xml = await fetchUrl(feedUrl);
        const source = getSourceName(feedUrl);
        const items = parseRSS(xml, source);
        allItems.push(...items);
      } catch (e) {
        console.error('Feed error:', feedUrl, e.message);
      }
    }
    
    let countryArticles = allItems.filter(article => articleMatchesCountry(article, country));
    
    // Sort by date
    countryArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Remove duplicates
    const seen = new Set();
    countryArticles = countryArticles.filter(article => {
      const key = article.title.substring(0, 50).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    const articles = countryArticles.slice(0, 10).map(article => ({
      headline: article.title,
      link: article.link,
      summary: article.description.substring(0, 200),
      source: article.source,
      timeAgo: getTimeAgo(new Date(article.pubDate))
    }));
    
    return res.status(200).json({
      country: country,
      articles: articles,
      count: articles.length
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
