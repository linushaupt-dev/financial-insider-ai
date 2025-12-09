// Simple in-memory cache (resets when function restarts, but that's fine)
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fallback events if scraper fails
const fallbackEvents = [
  { time: '12:00 AM', title: 'Economy Watchers Sentiment', currency: 'JPY', importance: 'medium' },
  { time: '2:00 AM', title: 'German Industrial Production', currency: 'EUR', importance: 'medium' },
  { time: '3:30 AM', title: 'RBA Interest Rate Decision', currency: 'AUD', importance: 'high' },
  { time: '4:30 AM', title: 'RBA Press Conference', currency: 'AUD', importance: 'medium' },
  { time: '7:00 AM', title: 'German Trade Balance', currency: 'EUR', importance: 'high' },
  { time: '8:30 AM', title: 'JOLTS Job Openings', currency: 'USD', importance: 'high' },
  { time: '10:00 AM', title: 'Consumer Confidence', currency: 'USD', importance: 'medium' },
  { time: '2:00 PM', title: 'FOMC Meeting Minutes', currency: 'USD', importance: 'high' },
  { time: '4:30 PM', title: 'Fed Chair Powell Speaks', currency: 'USD', importance: 'high' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedEvents && (now - lastFetchTime) < CACHE_DURATION) {
      return res.status(200).json({ 
        events: cachedEvents,
        cached: true,
        age: Math.floor((now - lastFetchTime) / 1000 / 60) + ' minutes'
      });
    }
    
    // Try to fetch fresh data from Forex Factory
    const events = await scrapeForexFactory();
    
    if (events && events.length > 0) {
      cachedEvents = events;
      lastFetchTime = now;
      return res.status(200).json({ 
        events: cachedEvents,
        cached: false,
        source: 'forex-factory'
      });
    }
    
    // If scraping failed, use cached or fallback
    if (cachedEvents) {
      return res.status(200).json({ 
        events: cachedEvents,
        cached: true,
        warning: 'Using stale cache (scraper failed)'
      });
    }
    
    // Last resort: fallback data
    return res.status(200).json({ 
      events: fallbackEvents,
      cached: false,
      source: 'fallback'
    });
    
  } catch (error) {
    console.error('Calendar error:', error);
    return res.status(200).json({ 
      events: cachedEvents || fallbackEvents,
      error: error.message
    });
  }
}

async function scrapeForexFactory() {
  try {
    const response = await fetch('https://www.forexfactory.com/calendar?week=this', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.forexfactory.com/',
      }
    });
    
    if (!response.ok) {
      console.error('FF fetch failed:', response.status);
      return null;
    }
    
    const html = await response.text();
    
    // Parse events from HTML
    const events = parseHTML(html);
    
    return events;
    
  } catch (error) {
    console.error('Scraper error:', error);
    return null;
  }
}

function parseHTML(html) {
  const events = [];
  
  try {
    // Find all calendar rows
    const rowRegex = /<tr[^>]*class="calendar__row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
    let match;
    
    while ((match = rowRegex.exec(html)) !== null) {
      const rowHtml = match[1];
      
      // Skip if it's a date row or empty
      if (rowHtml.includes('calendar__date') || rowHtml.includes('newday')) {
        continue;
      }
      
      // Extract time
      const timeMatch = rowHtml.match(/class="calendar__time[^"]*"[^>]*>([^<]+)</);
      const time = timeMatch ? timeMatch[1].trim() : null;
      
      // Extract currency
      const currencyMatch = rowHtml.match(/class="calendar__currency[^"]*"[^>]*>([^<]+)</);
      const currency = currencyMatch ? currencyMatch[1].trim() : '';
      
      // Extract title
      const titleMatch = rowHtml.match(/class="calendar__event-title[^"]*"[^>]*>([^<]+)</);
      const title = titleMatch ? titleMatch[1].trim() : null;
      
      // Extract importance (count impact icons)
      const impactCount = (rowHtml.match(/icon--ff-impact-/g) || []).length;
      let importance = 'low';
      if (impactCount >= 3) importance = 'high';
      else if (impactCount === 2) importance = 'medium';
      
      // Only add if we have a title and it's at least medium importance
      if (title && time && importance !== 'low') {
        events.push({
          time: formatTime(time),
          title: cleanTitle(title),
          currency: currency || 'USD',
          importance: importance
        });
      }
    }
    
    console.log(`Parsed ${events.length} events from Forex Factory`);
    return events.slice(0, 20); // Return top 20 events
    
  } catch (error) {
    console.error('Parse error:', error);
    return [];
  }
}

function formatTime(time) {
  // FF times might be like "12:30am" or "All Day" or "Tentative"
  if (!time || time === 'All Day' || time === 'Tentative') {
    return 'All Day';
  }
  
  // Convert to standard format
  const cleaned = time.toLowerCase().replace(/\s/g, '');
  
  // If already formatted (e.g., "12:30am"), convert to "12:30 AM"
  const match = cleaned.match(/(\d{1,2}):(\d{2})(am|pm)/);
  if (match) {
    const hours = match[1];
    const mins = match[2];
    const period = match[3].toUpperCase();
    return `${hours}:${mins} ${period}`;
  }
  
  return time;
}

function cleanTitle(title) {
  // Remove extra whitespace and decode HTML entities
  return title
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
