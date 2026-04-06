/**
 * ui.js — DOM builders for cards, tables, and states
 */

const UI = (() => {

  function el(tag, cls, inner) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (inner !== undefined) e.innerHTML = inner;
    return e;
  }

  function fmt(n, dec = 2) {
    if (n == null) return 'N/A';
    return n.toLocaleString('zh-TW', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function fmtBig(n) {
    if (n == null) return 'N/A';
    if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 億';
    if (n >= 1e4) return (n / 1e4).toFixed(2) + ' 萬';
    return n.toLocaleString('zh-TW');
  }

  function changeClass(v) {
    if (v == null) return 'flat';
    return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  }

  function changeSign(v) {
    if (v == null) return '';
    return v > 0 ? '▲' : v < 0 ? '▼' : '─';
  }

  // ── Skeleton loaders ─────────────────────────────────────────────────────
  function skeletonCompany() {
    return `
      <div class="skel-line lg skeleton" style="width:40%"></div>
      <div class="skel-line skeleton" style="width:60%"></div>
      <div class="skel-line sm skeleton" style="width:30%;margin-bottom:16px"></div>
      <div class="info-grid">
        ${Array(6).fill('<div class="skel-line skeleton"></div>').join('')}
      </div>`;
  }

  function skeletonTrading() {
    return `
      <div class="skel-line lg skeleton" style="width:50%"></div>
      <div class="ohlc-grid">
        ${Array(4).fill('<div class="skel-block skeleton" style="height:50px"></div>').join('')}
      </div>
      <div class="skel-line sm skeleton"></div>`;
  }

  function skeletonChart() {
    return `<div class="skel-block skeleton"></div>`;
  }

  function skeletonVal() {
    return `<div class="val-grid">${Array(3).fill('<div class="skel-block skeleton" style="height:80px;border-radius:10px"></div>').join('')}</div>`;
  }

  function skeletonSide() {
    return `
      <div class="skel-line skeleton" style="width:70%"></div>
      <div class="skel-line lg skeleton"></div>
      <div class="skel-line sm skeleton" style="width:40%"></div>`;
  }

  // ── Error state ──────────────────────────────────────────────────────────
  function renderError(container, msg) {
    container.innerHTML = `<div class="error-banner"><span class="icon">⚠️</span><span>${msg}</span></div>`;
  }

  // ── Company card ─────────────────────────────────────────────────────────
  function fmtRawDate(s) {
    // Convert "19870221" → "1987/02/21" or "19870221" → formatted
    const str = String(s || '');
    if (str.length === 8 && /^\d+$/.test(str)) {
      return `${str.slice(0,4)}/${str.slice(4,6)}/${str.slice(6,8)}`;
    }
    return str || '-';
  }

  function renderCompanyCard(container, company, industryName) {
    const cap = company['實收資本額'] || company['Capitals'] || '';
    const shares = company['已發行普通股數'] || '';
    const chairman = company['董事長'] || company['ChairmanName'] || '-';
    const ceo = company['總經理'] || '-';
    const established = fmtRawDate(company['成立日期']);
    const listed = fmtRawDate(company['上市日期'] || company['ListingDate']);
    const addr = company['住址'] || company['Address'] || '-';
    const engName = company['英文簡稱'] || '';

    container.innerHTML = `
      <div class="company-header">
        <div class="company-code">${company['公司代號'] || company['SecuritiesCompanyCode'] || ''}</div>
        <div class="company-name">${company['公司名稱'] || company['CompanyName'] || ''}</div>
        <div class="company-sub">${company['公司簡稱'] || ''} ${engName ? '· ' + engName : ''}</div>
      </div>
      <div class="industry-badge">${industryName || '未分類'}</div>
      <div class="info-grid">
        <div class="info-item"><label>董事長</label><span>${chairman}</span></div>
        <div class="info-item"><label>總經理</label><span>${ceo}</span></div>
        <div class="info-item"><label>成立日期</label><span>${established}</span></div>
        <div class="info-item"><label>上市日期</label><span>${listed}</span></div>
        <div class="info-item"><label>實收資本額</label><span>${cap ? fmtBig(parseFloat(String(cap).replace(/,/g,''))) : '-'}</span></div>
        <div class="info-item"><label>地址</label><span style="font-size:11px">${addr}</span></div>
      </div>`;
  }

  // ── Trading summary card ─────────────────────────────────────────────────
  function renderTradingCard(container, stock) {
    const close = parseFloat(String(stock.ClosingPrice || stock.Close || 0).replace(/,/g,''));
    const change = parseFloat(String(stock.Change || 0).replace(/,/g,''));
    const open   = parseFloat(String(stock.OpeningPrice || stock.Open || 0).replace(/,/g,''));
    const high   = parseFloat(String(stock.HighestPrice || stock.High || 0).replace(/,/g,''));
    const low    = parseFloat(String(stock.LowestPrice || stock.Low || 0).replace(/,/g,''));
    const vol    = parseFloat(String(stock.TradeVolume || stock.TradingShares || 0).replace(/,/g,''));
    const txn    = parseFloat(String(stock.Transaction || 0).replace(/,/g,''));
    const pct    = close ? ((change / (close - change)) * 100) : 0;
    const cls    = changeClass(change);
    const sign   = changeSign(change);

    container.innerHTML = `
      <div class="price-row">
        <div class="price-main">${fmt(close)}</div>
        <div class="price-change ${cls}">${sign} ${Math.abs(change).toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)</div>
      </div>
      <div class="ohlc-grid">
        <div class="ohlc-item"><label>開盤</label><span>${fmt(open)}</span></div>
        <div class="ohlc-item"><label>最高</label><span style="color:var(--green)">${fmt(high)}</span></div>
        <div class="ohlc-item"><label>最低</label><span style="color:var(--red)">${fmt(low)}</span></div>
        <div class="ohlc-item"><label>收盤</label><span>${fmt(close)}</span></div>
      </div>
      <div class="stat-row">
        <span>成交量 <b>${fmtBig(vol)}</b></span>
        ${txn ? `<span>成交筆數 <b>${txn.toLocaleString()}</b></span>` : ''}
      </div>`;
  }

  // ── Valuation card ───────────────────────────────────────────────────────
  function renderValuationCard(container, metrics) {
    const pe = metrics?.PEratio;
    const pb = metrics?.PBratio;
    const dy = metrics?.DividendYield;

    function peClass(v) {
      if (!v || v === '-') return 'muted';
      const n = parseFloat(v);
      if (isNaN(n)) return 'muted';
      if (n < 15) return 'green';
      if (n <= 25) return 'yellow';
      return 'red';
    }

    function dyClass(v) {
      if (!v || v === '-') return 'muted';
      const n = parseFloat(v);
      if (isNaN(n)) return 'muted';
      if (n >= 4) return 'green';
      if (n >= 2) return 'yellow';
      return 'muted';
    }

    function disp(v) { return (!v || v === '-') ? 'N/A' : v; }

    container.innerHTML = `
      <div class="val-grid">
        <div class="val-item">
          <label>本益比 (PE)</label>
          <div class="val-num ${peClass(pe)}">${disp(pe)}</div>
        </div>
        <div class="val-item">
          <label>股價淨值比 (PB)</label>
          <div class="val-num ${pb && pb !== '-' ? 'yellow' : 'muted'}">${disp(pb)}</div>
        </div>
        <div class="val-item">
          <label>殖利率 (%)</label>
          <div class="val-num ${dyClass(dy)}">${disp(dy)}</div>
        </div>
      </div>`;
  }

  // ── Industry index card ──────────────────────────────────────────────────
  function renderIndustryCard(container, indexRow, indexName) {
    if (!indexRow) {
      container.innerHTML = `<div style="color:var(--text-muted);font-size:13px">無法取得類股指數</div>`;
      return;
    }
    // TWSE MI_INDEX row format: [名稱, 收盤指數, 漲跌(+/-)html, 漲跌點數, 漲跌百分比(%), 備註]
    const name  = indexRow[0] || indexName || '-';
    const val   = parseFloat(String(indexRow[1] || 0).replace(/,/g,''));
    // Change percent (index 4) already has sign e.g. "-1.15"
    const pct   = parseFloat(String(indexRow[4] || 0).replace(/,/g,''));
    const pts   = parseFloat(String(indexRow[3] || 0).replace(/,/g,''));
    // Direction: color:red = up (漲), color:green = down (跌) in Taiwan convention
    const dirHtml = String(indexRow[2] || '');
    const isUp  = dirHtml.includes('color:red');
    const chg   = isUp ? pts : -pts;
    const cls   = changeClass(chg);
    const sign  = changeSign(chg);

    container.innerHTML = `
      <div class="index-name">${name}</div>
      <div class="index-val">${fmt(val, 2)}</div>
      <div class="index-change ${cls}">${sign} ${pts.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)</div>`;
  }

  // ── Peer comparison table ────────────────────────────────────────────────
  function renderPeerTable(container, peers, valuationMap, currentCode, onPeerClick) {
    if (!peers.length) {
      container.innerHTML = `<div style="color:var(--text-muted);font-size:13px">無同產業資料</div>`;
      return;
    }

    const rows = peers.map(p => {
      const code = p['公司代號'] || p['SecuritiesCompanyCode'];
      const name = p['公司名稱'] || p['CompanyName'];
      const val  = valuationMap[code] || {};
      return { code, name, pe: val.PEratio, pb: val.PBratio, dy: val.DividendYield, close: val.ClosePrice };
    }).sort((a, b) => {
      // Sort: current stock first, then by close price desc (proxy for market cap)
      if (a.code === currentCode) return -1;
      if (b.code === currentCode) return 1;
      return (parseFloat(b.close) || 0) - (parseFloat(a.close) || 0);
    }).slice(0, 15);

    function disp(v) { return (!v || v === '-') ? '-' : v; }

    const thead = `<thead><tr>
      <th>代號</th><th>名稱</th>
      <th class="td-right">收盤</th>
      <th class="td-right">本益比</th>
      <th class="td-right">淨值比</th>
      <th class="td-right">殖利率</th>
    </tr></thead>`;

    const tbody = rows.map(r => `
      <tr class="${r.code === currentCode ? 'current-stock' : ''}" data-code="${r.code}">
        <td>${r.code}</td>
        <td>${r.name}</td>
        <td class="td-right">${disp(r.close)}</td>
        <td class="td-right">${disp(r.pe)}</td>
        <td class="td-right">${disp(r.pb)}</td>
        <td class="td-right">${disp(r.dy)}</td>
      </tr>`).join('');

    container.innerHTML = `<div style="overflow-x:auto"><table class="peer-table">${thead}<tbody>${tbody}</tbody></table></div>`;

    // Click handler for peer rows
    container.querySelectorAll('tr[data-code]').forEach(row => {
      const code = row.dataset.code;
      if (code !== currentCode) {
        row.addEventListener('click', () => onPeerClick(code));
      }
    });
  }

  return {
    skeletonCompany,
    skeletonTrading,
    skeletonChart,
    skeletonVal,
    skeletonSide,
    renderError,
    renderCompanyCard,
    renderTradingCard,
    renderValuationCard,
    renderIndustryCard,
    renderPeerTable,
  };
})();
