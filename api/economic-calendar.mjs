export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Fetching events for date:', today);
    
    // Fetch economic calendar from FCS API
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${process.env.FCS_API_KEY}&from=${today}&to=${today}`
    );
    
    if (!response.ok) {
      throw new Error(`FCS API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('FCS API response:', JSON.stringify(data).substring(0, 500));
    
    if (!data.response) {
      // Return empty if no events
      res.status(200).json({ events: [], raw: data });
      return;
    }
    
    // Show ALL events (remove filter temporarily)
    const events = data.response.map(event => ({
      time: formatTime(event.date),
      title: event.title || event.event || 'Unknown Event',
      country: event.country,
      importance: event.impact ? event.impact.toLowerCase() : 'low',
      forecast: event.forecast || '—',
      previous: event.previous || '—',
      actual: event.actual || '—'
    }));
    
    console.log(`Found ${events.length} events`);
    
    res.status(200).json({ events, count: events.length });
    
  } catch (error) {
    console.error('Economic calendar error:', error);
    res.status(500).json({ error: error.message, details: error.stack });
  }
}

function formatTime(dateString) {
  try {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm} EST`;
  } catch (e) {
    return dateString;
  }
}
