const RSS2JSON_API_KEY = process.env.RSS2JSON_API_KEY;

const feeds = [
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', name: 'CNBC' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.marketwatch.com/rss/topstories', name: 'MarketWatch' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.ft.com/?format=rss', name: 'Financial Times' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://seekingalpha.com/feed.xml', name: 'Seeking Alpha' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.businessinsider.com/rss', name: 'Business Insider' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://fortune.com/feed', name: 'Fortune' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.forbes.com/real-time/feed2/', name: 'Forbes' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.economist.com/finance-and-economics/rss.xml', name: 'The Economist' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.a.dj.com/rss/RSSMarketsMain.xml', name: 'Wall Street Journal' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml', name: 'Wall Street Journal' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.barrons.com/feed/rss/', name: 'Barrons' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.thestreet.com/feeds/news/markets.xml', name: 'The Street' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.nasdaq.com/feed/rssoutbound', name: 'Nasdaq' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.benzinga.com/feed', name: 'Benzinga' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=http://rss.cnn.com/rss/money_latest.rss', name: 'CNN Business' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.reuters.com/rssFeed/businessNews', name: 'Reuters' }
];

const sourceReputation = {
  'Wall Street Journal': 10,
  'Financial Times': 10,
  'Reuters': 9,
  'The Economist': 9,
  'Barrons': 9,
  'CNBC': 8,
  'Forbes': 8,
  'Fortune': 8,
  'Business Insider': 7,
  'MarketWatch': 7,
  'Seeking Alpha': 7,
  'The Street': 6,
  'Benzinga': 6,
  'Nasdaq': 6,
  'CNN Business': 6,
  'BBC Business': 7
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const allArticles = [];
    
    const feedPromises = feeds.map(async (feed) => {
      try {
        const url = RSS2JSON_API_KEY 
          ? `${feed.url}&api_key=${RSS2JSON_API_KEY}`
          : feed.url;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          return data.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description,
            source: feed.name
          }));
        }
        return [];
      } catch (error) {
        console.error(`Error fetching feed ${feed.name}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(feedPromises);
    results.forEach(articles => allArticles.push(...articles));
    
    console.log(`Fetched ${allArticles.length} total articles`);
    
    const scoredArticles = await Promise.all(
      allArticles.map(async (article) => {
        const recencyScore = calculateRecencyScore(article.pubDate);
        const reputationScore = sourceReputation[article.source] || 5;
        
        const aiScore = await getAIScore(article);
        
        // Only include if AI score is 5 or higher
        if (aiScore < 5) {
          return null;
        }
        
        const totalScore = (recencyScore * 0.5) + (aiScore * 0.3) + (reputationScore * 0.2);
        
        return {
          headline: article.title,
          link: article.link,
          source: article.source,
          pubDate: article.pubDate,
          timeAgo: getTimeAgo(article.pubDate),
          summary: cleanSummary(article.description),
          score: totalScore,
          breakdown: {
            recency: recencyScore,
            ai: aiScore,
            reputation: reputationScore
          }
        };
      })
    );
    
    const topArticles = scoredArticles
      .filter(article => article !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    
    console.log(`Returning ${topArticles.length} filtered articles`);
    
    res.status(200).json({
      articles: topArticles,
      total: allArticles.length,
      filtered: topArticles.length,
      sources: feeds.length
    });
    
  } catch (error) {
    console.error('News API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getAIScore(article) {
  try {
    const prompt = `Rate this business news headline from 1-10 for a financial news website.

SCORE 7-10: Major business news
- Earnings, revenue, profit reports
- M&A, acquisitions, IPOs
- Fed policy, interest rates
- Jobs, GDP, inflation data
- Product launches from major companies
- Executive changes
- Regulatory news
- Market movements

SCORE 5-6: Standard business content
- Company announcements
- Analyst opinions
- Partnership deals
- Industry news
- Conference presentations
- Executive interviews

SCORE 1-4: Filter out
- Personal finance advice for individuals
- "How to invest" articles
- Lifestyle content
- Celebrity business stories

Headline: "${article.title}"

Return ONLY a number 1-10. Be generous with scores.`;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    const data = await response.json();
    const scoreText = data.content[0].text.trim();
    const score = parseInt(scoreText.match(/\d+/)?.[0] || '6');
    
    return Math.min(Math.max(score, 1), 10);
    
  } catch (error) {
    console.error('AI scoring error:', error);
    return 6;
  }
}

function calculateRecencyScore(pubDate) {
  const now = new Date();
  const published = new Date(pubDate);
  const hoursAgo = (now - published) / (1000 * 60 * 60);
  
  if (hoursAgo < 1) return 10;
  if (hoursAgo < 3) return 8;
  if (hoursAgo < 6) return 6;
  if (hoursAgo < 12) return 4;
  if (hoursAgo < 24) return 2;
  return 1;
}

function getTimeAgo(pubDate) {
  const now = new Date();
  const published = new Date(pubDate);
  const minutesAgo = Math.floor((now - published) / (1000 * 60));
  
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hr ago`;
  
  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
}

function cleanSummary(description) {
  if (!description) return '';
  
  const text = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
  
  return text.substring(0, 120) + (text.length > 120 ? '...' : '');
}
