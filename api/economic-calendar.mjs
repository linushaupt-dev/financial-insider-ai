export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch economic calendar from FCS API
    const response = await fetch(
      `https://fcsapi.com/api-v3/economic-calendar?access_key=${process.env.FCS_API_KEY}&date=${today}`
    );
    
    if (!response.ok) {
      throw new Error(`FCS API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response || data.status === false) {
      throw new Error('Invalid FCS API response');
    }
    
    // Filter and format the events
    const events = data.response
      .filter(event => {
        // Only show high and medium importance events
        return event.impact === 'high' || event.impact === 'medium';
      })
      .map(event => ({
        time: formatTime(event.date),
        title: event.event,
        country: event.country,
        currency: event.currency,
        importance: event.impact,
        forecast: event.forecast || '—',
        previous: event.previous || '—',
        actual: event.actual || '—'
      }))
      .sort((a, b) => {
        // Sort by time
        return new Date('1970/01/01 ' + a.time) - new Date('1970/01/01 ' + b.time);
      });
    
    res.status(200).json({ events });
    
  } catch (error) {
    console.error('Economic calendar error:', error);
    res.status(500).json({ error: error.message });
  }
}

function formatTime(dateString) {
  // Convert "2025-12-08 08:30:00" to "8:30 AM EST"
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${ampm} EST`;
}
