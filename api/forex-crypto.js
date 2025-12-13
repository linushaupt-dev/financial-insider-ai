export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Crypto symbols that work with Yahoo
    const cryptoSymbols = ['BTC-USD', 'ETH-USD', 'XRP-USD', 'SOL-USD', 'BNB-USD', 'ADA-USD', 'DOGE-USD'];
    // Forex ETFs (more reliable than currency pairs)
    const forexSymbols = ['FXE', 'FXB', 'FXY', 'FXC', 'FXA', 'FXF'];
    
    const allSymbols = [...cryptoSymbols, ...forexSymbols].join(',');
    
    const response = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${allSymbols}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com/'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Yahoo API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
      throw new Error('Invalid response structure');
    }
    
    const results = data.quoteResponse.result.map(item => ({
      symbol: item.symbol,
      price: item.regularMarketPrice || 0,
      change: item.regularMarketChange || 0,
      changePercent: item.regularMarketChangePercent || 0
    }));
    
    res.status(200).json({ data: results });
    
  } catch (error) {
    console.error('Forex/Crypto API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
}
