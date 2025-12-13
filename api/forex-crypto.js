export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Forex pairs (using ETFs/currency funds that work with Yahoo)
    const forexSymbols = ['EURUSD=X', 'GBPUSD=X', 'JPY=X', 'CADUSD=X', 'AUDUSD=X', 'CHFUSD=X'];
    // Crypto (Yahoo supports these)
    const cryptoSymbols = ['BTC-USD', 'ETH-USD', 'XRP-USD', 'SOL-USD', 'BNB-USD', 'ADA-USD'];
    
    const allSymbols = [...forexSymbols, ...cryptoSymbols].join(',');
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${allSymbols}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const data = await response.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
      throw new Error('Invalid response from Yahoo Finance');
    }
    
    const results = data.quoteResponse.result.map(item => ({
      symbol: item.symbol,
      price: item.regularMarketPrice,
      change: item.regularMarketChange,
      changePercent: item.regularMarketChangePercent
    }));
    
    res.status(200).json({ data: results });
    
  } catch (error) {
    console.error('Forex/Crypto API error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}
