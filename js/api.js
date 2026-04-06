/**
 * api.js — All data fetch calls
 *
 * Two base paths:
 *   /api/*          → proxied via local server.py to openapi.twse.com.tw (avoids CORS)
 *   www.twse.com.tw → direct fetch (CORS-allowed)
 */

const API = (() => {
  const cache = {};

  async function fetchCached(key, url) {
    if (cache[key]) return cache[key];
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const data = await res.json();
    cache[key] = data;
    return data;
  }

  /** Strip comma-formatted price strings → number */
  function p(str) {
    if (!str || str === '--' || str === '-' || str === '') return null;
    const n = parseFloat(String(str).replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }

  /** Convert ROC date "115/04/02" → Date */
  function rocToDate(s) {
    const parts = String(s).split('/');
    if (parts.length !== 3) return null;
    return new Date(+parts[0] + 1911, +parts[1] - 1, +parts[2]);
  }

  function fmtDate(d) {
    if (!d) return '';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  // ── Company list (proxied via local server) ──────────────────────────────
  async function getCompanyList() {
    return fetchCached('companyList', '/api/companies');
  }

  // ── All stocks today — from www.twse.com.tw MI_INDEX (CORS OK) ──────────
  async function getStockDayAll() {
    if (cache['stockDayAll']) return cache['stockDayAll'];
    const res = await fetch('https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?response=json&type=ALLBUT0999');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (d.stat !== 'OK') throw new Error('no_data');
    // Table index 8 = daily prices for all stocks
    const priceTable = d.tables?.find(t => t.data?.length > 100 && t.fields?.includes('收盤價'));
    if (!priceTable) throw new Error('price_table_not_found');

    const fields = priceTable.fields;
    const iCode  = fields.indexOf('證券代號');
    const iName  = fields.indexOf('證券名稱');
    const iOpen  = fields.indexOf('開盤價');
    const iHigh  = fields.indexOf('最高價');
    const iLow   = fields.indexOf('最低價');
    const iClose = fields.indexOf('收盤價');
    const iDir   = fields.indexOf('漲跌(+/-)');   // HTML: color:red=up, color:green=down
    const iDiff  = fields.indexOf('漲跌價差');     // absolute value
    const iVol   = fields.indexOf('成交股數');
    const iTxn   = fields.indexOf('成交筆數');
    const iPE    = fields.indexOf('本益比');

    const map = {};
    priceTable.data.forEach(row => {
      const code = row[iCode];
      if (!code) return;
      const dirHtml = String(row[iDir] || '');
      const isUp = dirHtml.includes('color:red');
      const absDiff = parseFloat(String(row[iDiff] || '0').replace(/,/g, '')) || 0;
      const signedDiff = isUp ? absDiff : -absDiff;
      map[code] = {
        Code: code,
        Name: row[iName],
        OpeningPrice:  row[iOpen],
        HighestPrice:  row[iHigh],
        LowestPrice:   row[iLow],
        ClosingPrice:  row[iClose],
        Change:        String(signedDiff),
        TradeVolume:   row[iVol],
        Transaction:   row[iTxn],
        PEratio:       row[iPE],
      };
    });
    cache['stockDayAll'] = map;
    return map;
  }

  // ── Single stock 30-day history ──────────────────────────────────────────
  async function getStockDay(code) {
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?stockNo=${encodeURIComponent(code)}&response=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.stat !== 'OK' || !data.data) throw new Error('no_data');

    const fields  = data.fields;
    const idxDate  = fields.indexOf('日期');
    const idxOpen  = fields.indexOf('開盤價');
    const idxHigh  = fields.indexOf('最高價');
    const idxLow   = fields.indexOf('最低價');
    const idxClose = fields.indexOf('收盤價');
    const idxVol   = fields.indexOf('成交股數');
    const idxDiff  = fields.indexOf('漲跌價差');

    return data.data.map(row => ({
      date:   rocToDate(row[idxDate]),
      label:  fmtDate(rocToDate(row[idxDate])),
      open:   p(row[idxOpen]),
      high:   p(row[idxHigh]),
      low:    p(row[idxLow]),
      close:  p(row[idxClose]),
      volume: p(row[idxVol]),
      diff:   p(row[idxDiff]),
    })).filter(r => r.close !== null);
  }

  // ── Valuation metrics (PE / PB / Yield) — proxied ───────────────────────
  async function getValuations() {
    if (cache['valuations']) return cache['valuations'];
    const data = await fetchCached('_val_raw', '/api/valuations');
    // data is array; fields: [代號, 名稱, 收盤, 殖利率, 股利年度, 本益比, 淨值比, 財報年季]
    const map = {};
    data.forEach(row => {
      // openapi.twse.com.tw returns English field names
      const code = row['Code'] || row['證券代號'];
      if (!code) return;
      map[code] = {
        Code:          code,
        Name:          row['Name']          || row['證券名稱'],
        ClosePrice:    row['ClosePrice']    || row['收盤價'],
        DividendYield: row['DividendYield'] || row['殖利率(%)'],
        PEratio:       row['PEratio']       || row['本益比'],
        PBratio:       row['PBratio']       || row['股價淨值比'],
      };
    });
    cache['valuations'] = map;
    return map;
  }

  // ── Monthly revenue (proxied) ────────────────────────────────────────────
  async function getMonthlyRevenue() {
    return fetchCached('monthlyRev', '/api/revenue');
  }

  // ── Industry indices — from www.twse.com.tw (CORS OK) ───────────────────
  async function getIndustryIndices() {
    if (cache['industryIdx']) return cache['industryIdx'];
    const res = await fetch('https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?response=json&type=ALLBUT0999');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d = await res.json();
    if (d.stat !== 'OK') throw new Error('no_data');
    // Table 0 = price indices, includes 各類指數 rows with "類指數" in name
    const table0 = d.tables?.[0];
    cache['industryIdx'] = table0;
    return table0;
  }

  // ── TPEX company list (proxied) ──────────────────────────────────────────
  async function getTpexCompanyList() {
    return fetchCached('tpexList', '/api/tpex_companies');
  }

  // ── TPEX daily close (proxied) ───────────────────────────────────────────
  async function getTpexDayAll() {
    if (cache['tpexDayAll']) return cache['tpexDayAll'];
    const data = await fetchCached('_tpex_raw', '/api/tpex');
    const map = {};
    data.forEach(row => {
      const code = row['SecuritiesCompanyCode'] || row['公司代號'];
      if (!code) return;
      map[code] = {
        Code:          code,
        Name:          row['CompanyName'] || row['公司名稱'],
        OpeningPrice:  row['Open'],
        HighestPrice:  row['High'],
        LowestPrice:   row['Low'],
        ClosingPrice:  row['Close'],
        Change:        row['Change'],
        TradeVolume:   row['TradingShares'],
      };
    });
    cache['tpexDayAll'] = map;
    return map;
  }

  return {
    getCompanyList,
    getStockDayAll,
    getStockDay,
    getValuations,
    getMonthlyRevenue,
    getIndustryIndices,
    getTpexCompanyList,
    getTpexDayAll,
    parseNum: p,
  };
})();
