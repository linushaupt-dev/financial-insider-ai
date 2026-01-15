// Economic Calendar API using Financial Modeling Prep
// Caches data for 24 hours to minimize bandwidth usage

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
    const apiKey = process.env.FMP_API_KEY;
    
    if (!apiKey) {
      console.error('FMP_API_KEY not configured');
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
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromDate}&to=${toDateStr}&apikey=${apiKey}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`FMP API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(200).json({ 
        events: getHardcodedEvents(), 
        date: today 
      });
    }
    
    // Filter for today's events and high/medium impact
    const events = data
      .filter(event => {
        const eventDate = event.date ? event.date.split(' ')[0] : '';
        // Filter for today and important events (impact: Low, Medium, High)
        const impact = (event.impact || '').toLowerCase();
        return eventDate === today && (impact === 'high' || impact === 'medium' || impact === 'low');
      })
      .map(event => {
        const impact = (event.impact || '').toLowerCase();
        let importance = 'low';
        if (impact === 'high') importance = 'high';
        else if (impact === 'medium') importance = 'medium';
        
        return {
          time: formatTime(event.date || ''),
          title: event.event || 'Economic Event',
          currency: event.currency || event.country || '',
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
    // Convert to EST/EDT
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
  // Fallback events for when API is unavailable
  return [
    { time: '8:30 AM', title: 'Initial Jobless Claims', currency: 'USD', importance: 'medium' },
    { time: '10:00 AM', title: 'Existing Home Sales', currency: 'USD', importance: 'medium' },
    { time: '10:30 AM', title: 'EIA Natural Gas Storage', currency: 'USD', importance: 'low' },
    { time: '11:00 AM', title: 'Kansas City Fed Mfg Index', currency: 'USD', importance: 'low' },
    { time: '1:00 PM', title: 'Treasury Note Auction', currency: 'USD', importance: 'medium' }
  ];
}
