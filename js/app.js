/**
 * app.js — Bootstrap, event wiring, state management
 */

// ── Industry code → Chinese name mapping ─────────────────────────────────
const INDUSTRY_MAP = {
  '01': '水泥工業', '02': '食品工業', '03': '塑膠工業', '04': '紡織纖維',
  '05': '電機機械', '06': '電器電纜', '07': '化學工業', '08': '玻璃陶瓷',
  '09': '造紙工業', '10': '鋼鐵工業', '11': '橡膠工業', '12': '汽車工業',
  '13': '建材營造', '14': '航運業',   '15': '觀光餐旅', '16': '金融保險',
  '17': '貿易百貨', '18': '綜合',     '19': '其他',     '20': '電子零組件',
  '21': '電腦及週邊設備', '22': '光電業', '23': '通信網路業', '24': '半導體業',
  '25': '電子通路業',    '26': '資訊服務業', '27': '其他電子業', '28': '文化創意業',
  '29': '生技醫療業',    '30': '油電燃氣業', '31': '電腦及週邊設備業', '32': '電子商務',
  '33': '觀光事業',      '34': '存託憑證',   'W':  '其他',
};

// Keywords to match industry index table rows
const INDUSTRY_INDEX_KEYWORDS = {
  '01': '水泥', '02': '食品', '03': '塑膠', '04': '紡織',
  '05': '電機', '06': '電纜', '07': '化學', '08': '玻璃',
  '09': '造紙', '10': '鋼鐵', '11': '橡膠', '12': '汽車',
  '13': '建材', '14': '航運', '15': '觀光', '16': '金融',
  '17': '百貨', '20': '電子零組件', '21': '電腦', '22': '光電',
  '23': '通信', '24': '半導體', '25': '電子通路', '26': '資訊服務',
  '27': '其他電子', '29': '生技', '30': '油電',
};

// ── DOM refs ──────────────────────────────────────────────────────────────
const $input   = document.getElementById('stock-input');
const $btn     = document.getElementById('search-btn');
const $welcome = document.getElementById('welcome');
const $results = document.getElementById('results');
const $history = document.getElementById('history-wrap');

// Result containers
const $company    = document.getElementById('card-company');
const $trading    = document.getElementById('card-trading');
const $priceChart = document.getElementById('card-price-chart');
const $valuation  = document.getElementById('card-valuation');
const $revenue    = document.getElementById('card-revenue');
const $industry   = document.getElementById('card-industry');
const $peers      = document.getElementById('card-peers');

// ── History (localStorage) ────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('tsaHistory') || '[]'); } catch { return []; }
}

function saveHistory(code) {
  let h = loadHistory().filter(c => c !== code);
  h.unshift(code);
  h = h.slice(0, 10);
  localStorage.setItem('tsaHistory', JSON.stringify(h));
}

function renderHistory() {
  const h = loadHistory();
  if (!h.length) { $history.style.display = 'none'; return; }
  $history.style.display = 'flex';
  $history.innerHTML = '<span class="history-label">最近：</span>';
  h.forEach(code => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = code;
    chip.addEventListener('click', () => search(code));
    $history.appendChild(chip);
  });
}

// ── Skeleton setup ────────────────────────────────────────────────────────
function showSkeletons() {
  $company.innerHTML    = UI.skeletonCompany();
  $trading.innerHTML    = UI.skeletonTrading();
  $priceChart.innerHTML = UI.skeletonChart();
  $valuation.innerHTML  = UI.skeletonVal();
  $revenue.innerHTML    = UI.skeletonChart();
  $industry.innerHTML   = UI.skeletonSide();
  $peers.innerHTML      = UI.skeletonSide();
}

// ── Main search ───────────────────────────────────────────────────────────
async function search(code) {
  code = String(code).trim().toUpperCase();
  if (!code) return;

  $input.value = code;
  $btn.disabled = true;
  $btn.textContent = '搜尋中…';
  $welcome.style.display = 'none';
  $results.style.display = 'grid';
  showSkeletons();

  try {
    // ── Step 1: find company (TWSE first, then TPEX) ──────────────────────
    let company = null;
    let isOtc = false;

    const [companyListRes] = await Promise.allSettled([API.getCompanyList()]);
    if (companyListRes.status === 'fulfilled') {
      company = companyListRes.value.find(c => c['公司代號'] === code);
    }

    if (!company) {
      // Try TPEX
      const [tpexRes] = await Promise.allSettled([API.getTpexCompanyList()]);
      if (tpexRes.status === 'fulfilled' && tpexRes.value) {
        company = tpexRes.value.find(c =>
          (c['SecuritiesCompanyCode'] || c['公司代號']) === code
        );
        if (company) isOtc = true;
      }
    }

    if (!company) {
      UI.renderError($company, `找不到股票代碼「${code}」，請確認輸入的是台股4碼代號（例：2330、2454）`);
      [$trading, $priceChart, $valuation, $revenue, $industry, $peers].forEach(c =>
        c.innerHTML = '<div style="color:var(--text-muted);font-size:13px">無資料</div>'
      );
      return;
    }

    const industryCode = company['產業別'] || '';
    const industryName = INDUSTRY_MAP[industryCode] || industryCode || '未分類';

    UI.renderCompanyCard($company, company, industryName);
    saveHistory(code);
    renderHistory();

    // ── Step 2: fire all data fetches in parallel ──────────────────────────
    const [
      dayAllRes,
      stockDayRes,
      valuationsRes,
      monthlyRevRes,
      industryIdxRes,
    ] = await Promise.allSettled([
      isOtc ? API.getTpexDayAll() : API.getStockDayAll(),
      API.getStockDay(code),
      API.getValuations(),
      API.getMonthlyRevenue(),
      API.getIndustryIndices(),
    ]);

    // ── Trading summary ───────────────────────────────────────────────────
    if (dayAllRes.status === 'fulfilled') {
      const dayMap = dayAllRes.value; // map keyed by code
      const stock = dayMap[code];
      if (stock) {
        UI.renderTradingCard($trading, stock);
      } else {
        UI.renderError($trading, '今日無交易資料（可能為休市或資料尚未更新）');
      }
    } else {
      UI.renderError($trading, '交易資料載入失敗');
    }

    // ── Price chart ───────────────────────────────────────────────────────
    if (stockDayRes.status === 'fulfilled' && stockDayRes.value.length) {
      const rows = stockDayRes.value;
      $priceChart.innerHTML = `<canvas id="price-canvas"></canvas>`;
      Charts.drawPriceChart('price-canvas', rows);
    } else {
      UI.renderError($priceChart, '歷史價格資料載入失敗');
    }

    // ── Valuation metrics ─────────────────────────────────────────────────
    let valuationMap = {};
    if (valuationsRes.status === 'fulfilled') {
      valuationMap = valuationsRes.value; // already a map keyed by code
      UI.renderValuationCard($valuation, valuationMap[code]);
    } else {
      UI.renderError($valuation, '估值資料載入失敗');
    }

    // ── Monthly revenue ───────────────────────────────────────────────────
    if (monthlyRevRes.status === 'fulfilled') {
      const allRev = monthlyRevRes.value;
      const revRows = allRev
        .filter(r => r['公司代號'] === code)
        .sort((a, b) => String(b['資料年月']).localeCompare(String(a['資料年月'])))
        .slice(0, 6)
        .reverse()
        .map(r => ({
          ym:      r['資料年月'] || '',
          revenue: parseFloat(String(r['營業收入-當月營收'] || 0).replace(/,/g,'')) || 0,
          mom:     parseFloat(String(r['營業收入-上月比較增減(%)'] || 0).replace(/,/g,'')) || null,
          yoy:     parseFloat(String(r['營業收入-去年同月增減(%)'] || 0).replace(/,/g,'')) || null,
        }));

      if (revRows.length) {
        $revenue.innerHTML = `<canvas id="revenue-canvas"></canvas>`;
        Charts.drawRevenueChart('revenue-canvas', revRows);
      } else {
        $revenue.innerHTML = `<div style="color:var(--text-muted);font-size:13px">無月營收資料</div>`;
      }
    } else {
      UI.renderError($revenue, '月營收資料載入失敗');
    }

    // ── Industry index ────────────────────────────────────────────────────
    if (industryIdxRes.status === 'fulfilled') {
      const table = industryIdxRes.value;
      const keyword = INDUSTRY_INDEX_KEYWORDS[industryCode] || industryName.slice(0, 3);
      let matchRow = null;
      if (table.data) {
        matchRow = table.data.find(row =>
          row[0] && row[0].includes(keyword)
        );
        if (!matchRow && table.data.length) {
          // fuzzy: try each char of industryName
          for (const ch of industryName) {
            matchRow = table.data.find(r => r[0] && r[0].includes(ch));
            if (matchRow) break;
          }
        }
      }
      UI.renderIndustryCard($industry, matchRow, industryName + '類指數');
    } else {
      UI.renderError($industry, '類股指數載入失敗');
    }

    // ── Peer comparison ───────────────────────────────────────────────────
    if (companyListRes.status === 'fulfilled') {
      const peers = companyListRes.value.filter(c => c['產業別'] === industryCode);
      UI.renderPeerTable($peers, peers, valuationMap, code, (peerCode) => search(peerCode));
    } else {
      UI.renderError($peers, '同業比較資料載入失敗');
    }

  } catch (err) {
    console.error(err);
    UI.renderError($company, `發生錯誤：${err.message}`);
  } finally {
    $btn.disabled = false;
    $btn.textContent = '搜尋';
  }
}

// ── Event listeners ───────────────────────────────────────────────────────
$btn.addEventListener('click', () => search($input.value));
$input.addEventListener('keydown', e => { if (e.key === 'Enter') search($input.value); });

// Example code chips in welcome screen
document.querySelectorAll('.example-codes .chip').forEach(chip => {
  chip.addEventListener('click', () => search(chip.textContent.split(' ')[0]));
});

// ── Init ──────────────────────────────────────────────────────────────────
renderHistory();
$input.focus();
