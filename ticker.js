async function loadTicker() {
  const symbols = ["SPY", "DIA", "QQQ", "VIX", "AAPL", "MSFT"];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;

  try {
    const res = await fetch(url);
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
          <span style="color:${change >= 0 ? "green" : "red"};">
            ${change >= 0 ? "+" : ""}${change.toFixed(2)}
            (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)
          </span>
        </div>
      `;
    }

    document.getElementById("ticker-bar").innerHTML = html;

  } catch (err) {
    document.getElementById("ticker-bar").innerHTML = "Error loading data";
  }
}

loadTicker();
setInterval(loadTicker, 60000);
