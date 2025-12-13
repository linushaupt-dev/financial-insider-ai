export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Use CoinGecko API (free, no auth required)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,binancecoin,cardano,dogecoin&vs_currencies=usd&include_24hr_change=true'
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    const cryptoMap = {
      'bitcoin': { symbol: 'BTC', name: 'Bitcoin' },
      'ethereum': { symbol: 'ETH', name: 'Ethereum' },
      'ripple': { symbol: 'XRP', name: 'XRP' },
      'solana': { symbol: 'SOL', name: 'Solana' },
      'binancecoin': { symbol: 'BNB', name: 'BNB' },
      'cardano': { symbol: 'ADA', name: 'Cardano' },
      'dogecoin': { symbol: 'DOGE', name: 'Dogecoin' }
    };
    
    const results = Object.entries(data).map(([id, values]) => ({
      symbol: cryptoMap[id].symbol,
      name: cryptoMap[id].name,
      price: values.usd,
      changePercent: values.usd_24h_change
    }));
    
    res.status(200).json({ data: results });
    
  } catch (error) {
    console.error('Crypto API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
