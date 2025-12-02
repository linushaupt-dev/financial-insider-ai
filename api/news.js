export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Use a free RSS feed that works reliably - BBC Business
    const rssUrl = encodeURIComponent('http://feeds.bbci.co.uk/news/business/rss.xml');
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&api_key=${process.env.RSS2JSON_API_KEY}&count=10`);
    
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`RSS parsing failed: ${data.message || 'Unknown error'}`);
    }
    
    // Process articles with AI paraphrasing
    const articles = await Promise.all(
      data.items.map(async item => {
        const summary = await paraphraseWithAI(item.description);
        
        return {
          headline: item.title,
          summary: summary,
          source: 'BBC Business',
          link: item.link,
          date: item.pubDate,
          timeAgo: getTimeAgo(item.pubDate)
        };
      })
    );
    
    res.status(200).json({ articles });
    
  } catch (error) {
    console.error('News API Error:', error);
    res.status(500).json({ error: 'Failed to fetch news', details: error.message });
  }
}

// Use Claude API to paraphrase
async function paraphraseWithAI(text) {
  try {
    // Strip HTML tags first
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    
    if (!cleanText) return 'No description available.';
    
    const response = await fetch('h
