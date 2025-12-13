export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true'
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    const cryptoMap = {
      'bitcoin': { symbol: 'BTC', name: 'Bitcoin' },
      'ethereum': { symbol: 'ETH', name: 'Ethereum' },
      'solana': { symbol: 'SOL', name: 'Solana' },
      'ripple': { symbol: 'XRP', name: 'XRP' }
    };
    
    // Return in specific order: BTC, ETH, SOL, XRP
    const order = ['bitcoin', 'ethereum', 'solana', 'ripple'];
    const results = order.map(id => ({
      symbol: cryptoMap[id].symbol,
      name: cryptoMap[id].name,
      price: data[id].usd,
      changePercent: data[id].usd_24h_change
    }));
    
    res.status(200).json({ data: results });
    
  } catch (error) {
    console.error('Crypto API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
