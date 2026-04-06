/**
 * charts.js — Chart.js wrappers
 * Depends on Chart.js loaded globally via CDN.
 */

const Charts = (() => {
  let priceChart = null;
  let revenueChart = null;

  const GRID_COLOR = 'rgba(51,65,85,0.6)';
  const ACCENT = '#3b82f6';
  const GREEN = '#22c55e';
  const RED = '#ef4444';

  function destroyChart(instance) {
    if (instance) {
      try { instance.destroy(); } catch (_) {}
    }
    return null;
  }

  // ── Price Line Chart ─────────────────────────────────────────────────────
  function drawPriceChart(canvasId, rows) {
    priceChart = destroyChart(priceChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !rows.length) return;

    const ctx = canvas.getContext('2d');
    const labels = rows.map(r => r.label);
    const closes = rows.map(r => r.close);
    const volumes = rows.map(r => r.volume);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, 'rgba(59,130,246,0.35)');
    grad.addColorStop(1, 'rgba(59,130,246,0)');

    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    const lineColor = lastClose >= firstClose ? GREEN : RED;

    priceChart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: '收盤價',
            data: closes,
            borderColor: lineColor,
            backgroundColor: grad,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: true,
            tension: 0.3,
            yAxisID: 'y',
            order: 1,
          },
          {
            type: 'bar',
            label: '成交量',
            data: volumes,
            backgroundColor: 'rgba(148,163,184,0.25)',
            borderWidth: 0,
            yAxisID: 'y2',
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#f1f5f9',
            callbacks: {
              label(ctx) {
                if (ctx.datasetIndex === 0) return ` 收盤: ${ctx.parsed.y?.toLocaleString()}`;
                return ` 成交量: ${(ctx.parsed.y / 1000).toFixed(0)}K`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID_COLOR },
            ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 8 },
          },
          y: {
            position: 'left',
            grid: { color: GRID_COLOR },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y2: {
            position: 'right',
            grid: { display: false },
            ticks: { display: false },
          },
        },
      },
    });
  }

  // ── Revenue Bar + YoY Line Chart ─────────────────────────────────────────
  function drawRevenueChart(canvasId, rows) {
    revenueChart = destroyChart(revenueChart);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !rows.length) return;

    const ctx = canvas.getContext('2d');
    const labels = rows.map(r => r.ym);
    const revenues = rows.map(r => r.revenue);
    const yoy = rows.map(r => r.yoy);

    revenueChart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: '月營收(千元)',
            data: revenues,
            backgroundColor: 'rgba(59,130,246,0.6)',
            borderColor: ACCENT,
            borderWidth: 1,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: '年增率(%)',
            data: yoy,
            borderColor: GREEN,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: GREEN,
            tension: 0.3,
            yAxisID: 'y2',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#f1f5f9',
            callbacks: {
              label(ctx) {
                if (ctx.datasetIndex === 0) return ` 營收: ${ctx.parsed.y?.toLocaleString()} 千元`;
                const v = ctx.parsed.y;
                return ` 年增率: ${v != null ? (v >= 0 ? '+' : '') + v.toFixed(1) + '%' : 'N/A'}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID_COLOR },
            ticks: { color: '#94a3b8', font: { size: 11 } },
          },
          y: {
            position: 'left',
            grid: { color: GRID_COLOR },
            ticks: {
              color: '#94a3b8', font: { size: 11 },
              callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'M' : v,
            },
          },
          y2: {
            position: 'right',
            grid: { display: false },
            ticks: {
              color: '#94a3b8', font: { size: 11 },
              callback: v => (v >= 0 ? '+' : '') + v.toFixed(0) + '%',
            },
          },
        },
      },
    });
  }

  return { drawPriceChart, drawRevenueChart };
})();
