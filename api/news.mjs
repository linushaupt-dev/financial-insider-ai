export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const rssUrl = encodeURIComponent('http://feeds.bbci.co.uk/news/business/rss.xml');
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&api_key=${process.env.RSS2JSON_API_KEY}&count=10`);
    
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`RSS parsing failed: ${data.message || 'Unknown error'}`);
    }
    
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

async function paraphraseWithAI(text) {
  try {
    const cleanText = text.replace(/<[^>]*>/g, '').trim();
    
    if (!cleanText) return 'No description available.';
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Rewrite this news headline/description in 1-2 sentences. Keep it factual and concise:\n\n${cleanText.substring(0, 500)}`
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error('AI API failed');
    }
    
    const data = await response.json();
    return data.content[0].text;
    
  } catch (error) {
    console.error('AI paraphrase error:', error);
    const clean = text.replace(/<[^>]*>/g, '').trim();
    return clean.substring(0, 150) + (clean.length > 150 ? '...' : '');
  }
}

function getTimeAgo(dateS
