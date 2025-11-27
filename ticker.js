async function loadTicker() {
  const url = 'https://financial-insider-ai.vercel.app/api/stocks';
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    console.log('API Response:', data); // Debug log
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
      document.getElementById("ticker-bar").innerHTML = "Error: Invalid data format";
      return;
    }
    
    const items = data.quoteResponse.result;
    
    // Filter out items with missing data
    const validItems = items.filter(item => 
      item.regularMarketPrice !== null && 
      item.regularMarketPrice !== undefined &&
      item.regularMarketChangePercent !== null &&
      item.regularMarketChangePercent !== undefined
    );
    
    if (validItems.length === 0) {
      document.getElementById("ticker-bar").innerHTML = "Error: No valid stock data";
      return;
    }
    
    let html = "";
    
    for (const item of validItems) {
      const name = item.shortName || item.symbol;
      const price = item.regularMarketPrice;
      const change = item.regularMarketChange || 0;
      const changePercent = item.regularMarketChangePercent || 0;
      
      html += `
        <div class="ticker-item">
          <strong>${name}</strong> • ${price.toFixed(2)}
          <span style="color:${change >= 0 ? "#0f7f3f" : "#c5221f"};">
            ${change >= 0 ? "+" : ""}${change.toFixed(2)}
            (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)
          </span>
        </div>
      `;
    }
    
    document.getElementById("ticker-bar").innerHTML = html;
    
  } catch (err) {
    console.error('Ticker error:', err);
    document.getElementById("ticker-bar").innerHTML = "Error: " + err.message;
  }
}

loadTicker();
setInterval(loadTicker, 60000);
