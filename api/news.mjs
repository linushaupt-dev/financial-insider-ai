function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function fetchFromSource(sourceUrl, sourceName) {
  try {
    const rssUrl = encodeURIComponent(sourceUrl);
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&api_key=${process.env.RSS2JSON_API_KEY}&count=5`);
    
    if (!response.ok) {
      console.log(`${sourceName} fetch failed`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      console.log(`${sourceName} parse failed:`, data.message);
      return [];
    }
    
    return data.items.map(item => ({
      headline: item.title,
      summary: item.description.replace(/<[^>]*>/g, '').substring(0, 200),
      source: sourceName,
      link: item.link,
      date: item.pubDate,
      timeAgo: getTimeAgo(item.pubDate)
    }));
  } catch (error) {
    console.error(`Error fetching ${sourceName}:`, error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Comprehensive list of financial news sources
    const sources = [
      { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
      { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
      { url: 'http://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
      { url: 'https://www.ft.com/?format=rss', name: 'Financial Times' },
      { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com' },
      { url: 'https://seekingalpha.com/feed.xml', name: 'Seeking Alpha' },
      { url: 'https://www.fool.com/feeds/index.aspx', name: 'Motley Fool' },
      { url: 'https://www.businessinsider.com/rss', name: 'Business Insider' },
      { url: 'https://fortune.com/feed', name: 'Fortune' },
      { url: 'https://www.forbes.com/real-time/feed2/', name: 'Forbes' },
      { url: 'https://www.economist.com/finance-and-economics/rss.xml', name: 'The Economist' },
      { url: 'https://www.wsj.com/xml/rss/3_7014.xml', name: 'Wall Street Journal' },
      { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', name: 'Dow Jones' },
      { url: 'https://www.barrons.com/rss', name: 'Barrons' },
      { url: 'https://www.thestreet.com/rss/index.rss', name: 'TheStreet' },
      { url: 'https://www.nasdaq.com/feed/rssoutbound', name: 'Nasdaq' },
      { url: 'https://www.benzinga.com/feed', name: 'Benzinga' },
      { url: 'https://www.cnn.com/services/rss/', name: 'CNN Business' }
    ];
    
    // Fetch all sources in parallel
    const allArticles = await Promise.all(
      sources.map(source => fetchFromSource(source.url, source.name))
    );
    
    // Flatten all articles into one array
    const flatArticles = allArticles.flat().filter(article => article.headline);
    
    console.log(`Total articles fetched: ${flatArticles.length}`);
    
    // Shuffle to mix sources randomly
    const articles = shuffleArray(flatArticles).slice(0, 20);
    
    res.status(200).json({ articles });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
