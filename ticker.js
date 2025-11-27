async function loadTicker() {
  // Use YOUR Vercel API instead of Yahoo directly
  const url = 'https://financial-insider-ai.vercel.app/api/stocks';
  
  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.quoteResponse || !data.quoteResponse.result) {
      document.getElementById("ticker-bar").innerHTML = "Error loading data";
      return;
    }
    
    const items = data.quoteResponse.result;
    let html = "";
    
    for (const item of items) {
      const name = item.shortName || item.symbol;
      const price = item.regularMarketPrice;
      const change = item.regularMarketChange;
      const changePercent = item.regularMarketChangePercent;
      
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
    document.getElementById("ticker-bar").innerHTML = "Error loading data";
  }
}

loadTicker();
setInterval(loadTicker, 60000);
