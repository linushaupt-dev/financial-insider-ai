export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Get date range - today through next 3 days
    const today = new Date();
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 3);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = threeDays.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${process.env.FCS_API_KEY}&from=${fromDate}&to=${toDate}`
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
    // importance: "2" or "3" = high, "1" = medium
    const events = data.response
      .filter(event => {
        const imp = parseInt(event.importance);
        return imp >= 1 && imp <= 3; // Medium to High
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
      .slice(0, 20); // Top 20 events
    
    res.status(200).json({ events });
    
  } catch (error) {
    console.error('Economic calendar error:', error);
    res.status(500).json({ error: error.message });
  }
}

function formatTime(dateString) {
  try {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const min = minutes.toString().padStart(2, '0');
    
    return `${hours}:${min} ${ampm}`;
  } catch (e) {
    return 'TBD';
  }
}
