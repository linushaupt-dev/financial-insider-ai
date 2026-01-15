// Crypto ticker API - BTC, ETH, SOL, XRP
// Uses CoinGecko with fallback data

let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  
  // Return cached data if fresh
  if (cachedData && Date.now() - cacheTime < CACHE_DURATION) {
    return res.status(200).json({ data: cachedData, cached: true });
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true',
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    clearTimeout(timeoutId);
    
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
      price: data[id]?.usd || 0,
      changePercent: data[id]?.usd_24h_change || 0
    }));
    
    // Cache the results
    cachedData = results;
    cacheTime = Date.now();
    
    res.status(200).json({ data: results });
    
  } catch (error) {
    console.error('Crypto API error:', error.message);
    
    // If we have cached data, return it even if stale
    if (cachedData) {
      return res.status(200).json({ 
        data: cachedData, 
        cached: true,
        stale: true 
      });
    }
    
    // Fallback data if everything fails
    const fallbackData = [
      { symbol: 'BTC', name: 'Bitcoin', price: 96500, changePercent: 0.5 },
      { symbol: 'ETH', name: 'Ethereum', price: 3250, changePercent: 0.3 },
      { symbol: 'SOL', name: 'Solana', price: 185, changePercent: 1.2 },
      { symbol: 'XRP', name: 'XRP', price: 2.85, changePercent: -0.4 }
    ];
    
    res.status(200).json({ 
      data: fallbackData, 
      fallback: true,
      error: error.message 
    });
  }
}
