export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const symbols = ['DIA', 'QQQ', 'SPY', 'AAPL', 'MSFT', 'GOOGL'];
  const API_KEY = 'ctjaq59r01qla39vphe0ctjaq59r01qla39vpheg'; // Free demo key
  
  try {
    const promises = symbols.map(symbol =>
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`)
        .then(r => r.json())
        .then(data => ({ symbol, ...data }))
    );
    
    const results = await Promise.all(promises);
    
    // Format to match the expected structure
    const formatted = {
      quoteResponse: {
        result: results.map(item => ({
          symbol: item.symbol,
          shortName: item.symbol === 'DIA' ? 'Dow Jones' : 
                     item.symbol === 'QQQ' ? 'Nasdaq 100' :
                     item.symbol === 'SPY' ? 'S&P 500' : item.symbol,
          regularMarketPrice: item.c,
          regularMarketChange: item.d,
          regularMarketChangePercent: item.dp
        }))
      }
    };
    
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}
