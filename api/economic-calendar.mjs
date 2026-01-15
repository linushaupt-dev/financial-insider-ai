// Economic Calendar API using FCS API
// Caches data for 24 hours to minimize API usage

let cachedEvents = null;
let cacheDate = null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Return cached data if from today
  if (cachedEvents && cacheDate === today) {
    return res.status(200).json({ 
      events: cachedEvents, 
      date: today,
      cached: true 
    });
  }
  
  try {
    const apiKey = process.env.FCS_API_KEY;
    
    if (!apiKey) {
      console.error('FCS_API_KEY not configured');
      return res.status(200).json({ 
        events: getHardcodedEvents(), 
        date: today,
        note: 'Using fallback - API key not configured' 
      });
    }
    
    // Get events for today and next 2 days
    const fromDate = today;
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 2);
    const toDateStr = toDate.toISOString().split('T')[0];
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${apiKey}&from=${fromDate}&to=${toDateStr}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    // Check if API limit exceeded
    if (!data.status || data.code === 211) {
      console.log('FCS API limit exceeded, using fallback');
      return res.status(200).json({ 
        events: getHardcodedEvents(), 
        date: today,
        note: 'API limit reached, using cached events'
      });
    }
    
    if (!data.response || !Array.isArray(data.response)) {
      return res.status(200).json({ 
        events: getHardcodedEvents(), 
        date: today 
      });
    }
    
    // Filter for today's events with importance >= 1
    const events = data.response
      .filter(event => {
        const eventDate = event.date ? event.date.split(' ')[0] : '';
        const imp = parseInt(event.importance || 0);
        return eventDate === today && imp >= 1;
      })
      .map(event => {
        const imp = parseInt(event.importance || 0);
        let importance = 'low';
        if (imp === 3) importance = 'high';
        else if (imp === 2) importance = 'medium';
        
        return {
          time: formatTime(event.date || ''),
          title: event.title || 'Economic Event',
          currency: event.currency || '',
          importance: importance
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 15);
    
    // Cache the results
    if (events.length > 0) {
      cachedEvents = events;
      cacheDate = today;
    }
    
    res.status(200).json({ 
      events: events.length > 0 ? events : getHardcodedEvents(), 
      date: today 
    });
    
  } catch (error) {
    console.error('Calendar error:', error.message);
    res.status(200).json({ 
      events: getHardcodedEvents(), 
      date: today,
      error: error.message 
    });
  }
}

function formatTime(dateString) {
  if (!dateString) return 'TBD';
  
  try {
    const date = new Date(dateString);
    const options = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    };
    return date.toLocaleTimeString('en-US', options);
  } catch (e) {
    return 'TBD';
  }
}

function getHardcodedEvents() {
  return [
    { time: '8:30 AM', title: 'Initial Jobless Claims', currency: 'USD', importance: 'medium' },
    { time: '10:00 AM', title: 'Existing Home Sales', currency: 'USD', importance: 'medium' },
    { time: '10:30 AM', title: 'EIA Natural Gas Storage', currency: 'USD', importance: 'low' },
    { time: '11:00 AM', title: 'Kansas City Fed Mfg Index', currency: 'USD', importance: 'low' },
    { time: '1:00 PM', title: 'Treasury Note Auction', currency: 'USD', importance: 'medium' }
  ];
}
