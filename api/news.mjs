function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

async function fetchFromSource(sourceUrl, sourceName) {
  try {
    const rssUrl = encodeURIComponent(sourceUrl);
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&api_key=${process.env.RSS2JSON_API_KEY}&count=5`);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    if (data.status !== 'ok') return [];
    
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
    // Fetch from multiple sources
    const sources = [
      { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
      { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters' },
      { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
      { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg' }
    ];
    
    // Fetch all sources in parallel
    const allArticles = await Promise.all(
      sources.map(source => fetchFromSource(source.url, source.name))
    );
    
    // Flatten array and sort by date (newest first)
    const articles = allArticles
      .flat()
      .filter(article => article.headline)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 15); // Return top 15 most recent
    
    res.status(200).json({ articles });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
