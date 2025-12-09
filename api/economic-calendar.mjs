export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Get current date in EST/New York timezone
    const now = new Date();
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // Get today and next 2 days
    const today = estDate.toISOString().split('T')[0];
    const twoDaysLater = new Date(estDate);
    twoDaysLater.setDate(estDate.getDate() + 2);
    const toDate = twoDaysLater.toISOString().split('T')[0];
    
    console.log('Fetching events from', today, 'to', toDate);
    
    // Fetch economic calendar from FCS API
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${process.env.FCS_API_KEY}&from=${today}&to=${toDate}`
    );
    
    if (!response.ok) {
      throw new Error(`FCS API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response || !Array.isArray(data.response)) {
      res.status(200).json({ events: [] });
      return;
    }
    
    // Filter and format events
    const events = data.response
      .filter(event => {
        const imp = parseInt(event.importance);
        return imp >= 2; // Only high importance (2 or 3)
      })
      .map(event => {
        const imp = parseInt(event.importance);
        let importance = 'low';
        if (imp === 3) importance = 'high';
        else if (imp === 2) importance = 'high';
        else if (imp === 1) importance = 'medium';
        
        return {
          date: event.date.split(' ')[0],
          time: formatTime(event.date),
          title: event.title,
          country: event.country,
          currency: event.currency,
          importance: importance,
          forecast: event.forecast || '—',
          previous: event.previous || '—',
          actual: event.actual || '—'
        };
      })
      .sort((a, b) => {
        return new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time);
      })
      .slice(0, 15); // Top 15 events
    
    console.log(`Returning ${events.length} high-importance events`);
    
    res.status(200).json({ events });
    
  } catch (error) {
    console.error('Economic calendar error:', error);
    res.status(500).json({ error: error.message });
  }
}

function formatTime(dateString) {
  try {
    const date = new Date(dateString + ' UTC'); // Parse as UTC
    // Convert to EST
    const estTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    let hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const min = minutes.toString().padStart(2, '0');
    
    return `${hours}:${min} ${ampm}`;
  } catch (e) {
    return 'TBD';
  }
}
