const Parser = require('rss-parser');
const Anthropic = require('@anthropic-ai/sdk');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// International news RSS feeds
const WORLD_NEWS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NY Times' },
  { url: 'https://feeds.reuters.com/Reuters/worldNews', source: 'Reuters' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
  { url: 'https://feeds.washingtonpost.com/rss/world', source: 'Washington Post' },
  { url: 'https://rss.cnn.com/rss/edition_world.rss', source: 'CNN' },
  { url: 'https://www.ft.com/world?format=rss', source: 'Financial Times' }
];

// Country name variations and related terms for better matching
const COUNTRY_ALIASES = {
  'United States': ['USA', 'U.S.', 'US', 'America', 'American', 'Washington', 'Biden', 'Trump', 'Congress', 'White House'],
  'United Kingdom': ['UK', 'Britain', 'British', 'England', 'London', 'Parliament', 'Starmer', 'Sunak'],
  'Russia': ['Russian', 'Moscow', 'Putin', 'Kremlin'],
  'China': ['Chinese', 'Beijing', 'Xi Jinping', 'CCP'],
  'Germany': ['German', 'Berlin', 'Scholz', 'Bundesbank'],
  'France': ['French', 'Paris', 'Macron', 'Élysée'],
  'Japan': ['Japanese', 'Tokyo', 'Kishida'],
  'India': ['Indian', 'Delhi', 'Modi', 'Mumbai'],
  'Brazil': ['Brazilian', 'Brasilia', 'Lula', 'São Paulo'],
  'Canada': ['Canadian', 'Ottawa', 'Trudeau', 'Toronto'],
  'Australia': ['Australian', 'Canberra', 'Sydney', 'Melbourne'],
  'Italy': ['Italian', 'Rome', 'Meloni', 'Milan'],
  'Spain': ['Spanish', 'Madrid', 'Barcelona'],
  'Mexico': ['Mexican', 'Mexico City'],
  'South Korea': ['Korean', 'Seoul', 'Korea'],
  'Saudi Arabia': ['Saudi', 'Riyadh', 'MBS'],
  'Turkey': ['Turkish', 'Ankara', 'Istanbul', 'Erdogan'],
  'Israel': ['Israeli', 'Tel Aviv', 'Jerusalem', 'Netanyahu', 'Gaza', 'Hamas'],
  'Ukraine': ['Ukrainian', 'Kyiv', 'Kiev', 'Zelensky'],
  'Poland': ['Polish', 'Warsaw'],
  'Netherlands': ['Dutch', 'Amsterdam', 'Holland'],
  'Switzerland': ['Swiss', 'Zurich', 'Geneva'],
  'Sweden': ['Swedish', 'Stockholm'],
  'Norway': ['Norwegian', 'Oslo'],
  'Argentina': ['Argentine', 'Buenos Aires', 'Milei'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Pretoria'],
  'Egypt': ['Egyptian', 'Cairo', 'Sisi'],
  'Iran': ['Iranian', 'Tehran', 'Khamenei'],
  'Iraq': ['Iraqi', 'Baghdad'],
  'Syria': ['Syrian', 'Damascus', 'Assad'],
  'Pakistan': ['Pakistani', 'Islamabad', 'Karachi'],
  'Indonesia': ['Indonesian', 'Jakarta'],
  'Thailand': ['Thai', 'Bangkok'],
  'Vietnam': ['Vietnamese', 'Hanoi', 'Ho Chi Minh'],
  'Philippines': ['Filipino', 'Manila', 'Marcos'],
  'Nigeria': ['Nigerian', 'Lagos', 'Abuja'],
  'Kenya': ['Kenyan', 'Nairobi'],
  'Colombia': ['Colombian', 'Bogota'],
  'Chile': ['Chilean', 'Santiago'],
  'Peru': ['Peruvian', 'Lima'],
  'Venezuela': ['Venezuelan', 'Caracas', 'Maduro'],
  'Greece': ['Greek', 'Athens'],
  'Portugal': ['Portuguese', 'Lisbon'],
  'Ireland': ['Irish', 'Dublin'],
  'Belgium': ['Belgian', 'Brussels'],
  'Austria': ['Austrian', 'Vienna'],
  'Czech Republic': ['Czech', 'Prague'],
  'Hungary': ['Hungarian', 'Budapest', 'Orban'],
  'Romania': ['Romanian', 'Bucharest'],
  'Georgia': ['Georgian', 'Tbilisi']
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  const interval = seconds / 3600;
  
  if (interval > 24) {
    const days = Math.floor(interval / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (interval > 1) {
    const hours = Math.floor(interval);
    return hours === 1 ? '1 hr ago' : `${hours} hr ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes > 1) {
    return `${minutes} min ago`;
  }
  return 'Just now';
}

function articleMatchesCountry(article, country) {
  const title = article.title?.toLowerCase() || '';
  const content = article.contentSnippet?.toLowerCase() || article.content?.toLowerCase() || '';
  const text = title + ' ' + content;
  
  const countryLower = country.toLowerCase();
  
  // Check exact country name
  if (text.includes(countryLower)) {
    return true;
  }
  
  // Check aliases
  const aliases = COUNTRY_ALIASES[country] || [];
  for (const alias of aliases) {
    if (text.includes(alias.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

async function fetchFeed(feedInfo) {
  try {
    const feed = await parser.parseURL(feedInfo.url);
    return feed.items.map(item => ({
      title: item.title,
      link: item.link,
      content: item.contentSnippet || item.content || '',
      pubDate: item.pubDate,
      source: feedInfo.source
    }));
  } catch (error) {
    console.error(`Error fetching ${feedInfo.source}:`, error.message);
    return [];
  }
}

module.exports = async (req, res) => {
  // CORS headers
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
    // Fetch all feeds in parallel
    const feedPromises = WORLD_NEWS_FEEDS.map(feed => fetchFeed(feed));
    const feedResults = await Promise.all(feedPromises);
    
    // Flatten all articles
    let allArticles = feedResults.flat();
    
    // Filter articles that match the country
    let countryArticles = allArticles.filter(article => articleMatchesCountry(article, country));
    
    // Sort by date (newest first)
    countryArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Remove duplicates based on title similarity
    const seenTitles = new Set();
    countryArticles = countryArticles.filter(article => {
      const titleKey = article.title.toLowerCase().substring(0, 50);
      if (seenTitles.has(titleKey)) {
        return false;
      }
      seenTitles.add(titleKey);
      return true;
    });
    
    // Format the response
    const articles = countryArticles.slice(0, 10).map(article => ({
      headline: article.title,
      link: article.link,
      summary: article.content?.substring(0, 200) || '',
      source: article.source,
      timeAgo: getTimeAgo(new Date(article.pubDate))
    }));
    
    return res.status(200).json({
      country: country,
      articles: articles,
      count: articles.length
    });
    
  } catch (error) {
    console.error('World news API error:', error);
    return res.status(500).json({ error: 'Failed to fetch news' });
  }
};
