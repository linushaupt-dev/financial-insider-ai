const RSS2JSON_API_KEY = process.env.RSS2JSON_API_KEY;

const feeds = [
  'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/business/rss.xml',
  'https://api.rss2json.com/v1/api.json?rss_url=https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.marketwatch.com/rss/topstories',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.ft.com/?format=rss',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.investing.com/rss/news.rss',
  'https://api.rss2json.com/v1/api.json?rss_url=https://seekingalpha.com/feed.xml',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.fool.com/feeds/index.aspx',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.businessinsider.com/rss',
  'https://api.rss2json.com/v1/api.json?rss_url=https://fortune.com/feed',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.forbes.com/real-time/feed2/',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.economist.com/finance-and-economics/rss.xml',
  'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
  'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.barrons.com/feed/rss/',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.thestreet.com/feeds/news/markets.xml',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.nasdaq.com/feed/rssoutbound',
  'https://api.rss2json.com/v1/api.json?rss_url=https://www.benzinga.com/feed',
  'https://api.rss2json.com/v1/api.json?rss_url=http://rss.cnn.com/rss/money_latest.rss'
];

const sourceReputation = {
  'Wall Street Journal': 10,
  'Financial Times': 10,
  'Bloomberg': 10,
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
  'Investing.com': 6,
  'CNN Business': 6,
  'Motley Fool': 5,
  'BBC Business': 7
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const allArticles = [];
    
    const feedPromises = feeds.map(async (feedUrl) => {
      try {
        const url = RSS2JSON_API_KEY 
          ? `${feedUrl}&api_key=${RSS2JSON_API_KEY}`
          : feedUrl;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          return data.items.map(item => ({
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            description: item.description,
            source: data.feed?.title || 'Unknown'
          }));
        }
        return [];
      } catch (error) {
        console.error(`Error fetching feed ${feedUrl}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(feedPromises);
    results.forEach(articles => allArticles.push(...articles));
    
    const scoredArticles = await Promise.all(
      allArticles.map(async (article) => {
        const recencyScore = calculateRecencyScore(article.pubDate);
        const reputationScore = sourceReputation[article.source] || 5;
        
        const aiScore = await getAIScore(article);
        
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
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    
    res.status(200).json({
      articles: topArticles,
      total: allArticles.length,
      sources: feeds.length
    });
    
  } catch (error) {
    console.error('News API error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getAIScore(article) {
  try {
    const prompt = `You are a senior financial analyst filtering news for C-suite executives, institutional investors, and business professionals. Rate this headline's importance from 1-10.

CRITERIA FOR HIGH SCORES (7-10):
- Major earnings reports or guidance changes from significant companies
- M&A deals, IPOs, major corporate transactions
- Federal Reserve decisions, central bank policy, interest rate changes
- Key economic indicators (jobs, GDP, inflation, manufacturing data)
- Significant regulatory changes affecting industries
- Major product launches or technological breakthroughs affecting markets
- Leadership changes at Fortune 500 companies
- Geopolitical events with direct market impact
- Industry-wide disruptions or trends
- Major bankruptcies, restructurings, or financial distress at notable companies

REJECT WITH LOW SCORES (1-4):
- Personal finance advice ("Should I...", "How to...", "Do I need...")
- Individual consumer stories or anecdotes
- Lifestyle, entertainment, or celebrity business content
- Opinion pieces about personal decisions
- Real estate advice for individual homebuyers
- Retail investor tips or personal portfolio advice
- Wedding expenses, personal budgets, individual purchases
- "Best credit cards", "How much to save", etc.
- Human interest stories tangentially related to business
- Minor company announcements with no market impact

Headline: "${article.title}"
Source: ${article.source}
Description: ${article.description || ''}

Consider: Would a Bloomberg Terminal subscriber care about this? Would it move markets or affect business decisions?

Return ONLY a number 1-10. Be harsh - most headlines should score 5 or below.`;
    
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
    const score = parseInt(scoreText.match(/\d+/)?.[0] || '5');
    
    return Math.min(Math.max(score, 1), 10);
    
  } catch (error) {
    console.error('AI scoring error:', error);
    return 5;
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
