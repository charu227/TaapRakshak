import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { SF, GD, KB } from './data.js';
import {
  CFG, R, C, E, RG, AL, AQL, OSIadv, aqLv, scoreTier, lv, day, LN, SC, GC, isOpen, tel, HF, WP, HP, WT, DEST,
  makeWards, makeCC, mk, WPOLY, WCEN, WBOUNDS, LK, wardPlaces, nearestWard, safeHours, bestSlot, HWIN, RO, hv, computeRoutes, reply
} from './logic.js';

const Ctx = createContext(null);
const useC = () => useContext(Ctx);

/* ---------- small shared pieces ---------- */
const Badge = ({ r }) => <span className="badge" style={{ color: C[r], background: C[r] + '22', borderColor: C[r] }}>{E[r]} {R[r]}</span>;
const AqBadge = ({ l }) => <span className="badge" style={{ color: C[l], background: C[l] + '22', borderColor: C[l] }}>{E[l]} {AQL[l]}</span>;
const Row = ({ l, children, style }) => <div className="row" style={style}><span>{l}</span>{children}</div>;
const Legend = () => <div className="leg">{R.map((r, i) => <span key={i}><i style={{ background: C[i] }}></i>{r}</span>)}</div>;
const Ul = ({ children, style }) => <ul style={{ margin: 0, paddingLeft: 18, ...style }}>{children}</ul>;

function Scale({ c }) {
  return <table><tbody><tr><th>HTSI</th><th>Risk</th><th style={{ textAlign: 'left' }}>User alert</th></tr>
    {R.map((r, i) => <tr key={i} style={c == i ? { background: C[i] + '22', fontWeight: 700 } : undefined}><td>{RG[i]}</td><td>{E[i]} {r}</td><td style={{ textAlign: 'left' }}>{AL[i]}</td></tr>)}</tbody></table>;
}

function OsiCard({ i }) {
  const { W, H } = useC(), w = W[i], h = lv(w.htsi), a = aqLv(w.aqi), o = H.osiLv(i), both = h >= 2 && a >= 2;
  return <div className="card"><h2>🌫️ Outdoor Safety Index</h2><p className="sub">Combines thermal stress with air quality — what "safe to go outside" really means today.</p>
    <div className="row"><span style={{ fontSize: 34, fontWeight: 800, color: C[o] }}>{R[o]}</span><Badge r={o} /></div>
    <div className="grid" style={{ margin: '8px 0' }}>
      <div className="tile" style={{ borderColor: C[h], color: C[h] }}><b>{w.htsi}</b><span className="sub">🌡️ HTSI · {R[h]}</span></div>
      <div className="tile" style={{ borderColor: C[a], color: C[a] }}><b>{w.aqi}</b><span className="sub">🌫️ AQI · {AQL[a]}</span></div>
    </div><p className="sub">{OSIadv[o]}</p>
    {both && <p className="sub" style={{ color: C[3], fontWeight: 700 }}>⚠️ Heat and pollution are compounding today — combined risk is higher than either alone.</p>}</div>;
}

function MyScoreCard({ i }) {
  const { W, H } = useC(), w = W[i], s = H.heatScore(i), rank = W.map((_, k) => H.heatScore(k)).sort((a, b) => b - a).indexOf(s) + 1;
  return <div className="card"><h2>🌳 Ward Heat Resilience Score</h2><p className="sub">Long-term mitigation, not just today's warning — based on tree cover and cool-roof adoption.</p>
    <div className="row"><span style={{ fontSize: 34, fontWeight: 800, color: scoreTier(s) }}>{s}<small className="sub">/100</small></span><b>Rank #{rank} of {W.length}</b></div>
    <div className="row" style={{ marginTop: 4 }}><span>🌳 Tree cover</span><b>{w.tree}%</b></div><div className="bar"><i style={{ width: w.tree + '%', background: '#2e7d32' }}></i></div>
    <div className="row" style={{ marginTop: 8 }}><span>🏠 Cool-roof adoption</span><b>{w.roof}%</b></div><div className="bar"><i style={{ width: w.roof + '%', background: '#1565c0' }}></i></div>
    <p className="sub" style={{ marginTop: 8 }}>{s < 35 ? 'Low resilience — more trees and reflective/cool roofs would cut future heat risk here.' : s < 60 ? 'Moderate resilience — keep expanding green cover and cool roofs.' : 'Good resilience — this ward is well-prepared for long-term heat mitigation.'}</p></div>;
}

function LeaderboardCard({ hi }) {
  const { W, H } = useC(), rk2 = W.map((w, i) => ({ i, s: H.heatScore(i) })).sort((a, b) => b.s - a.s), medal = ['🥇', '🥈', '🥉'];
  return <div className="card"><h2>🏆 Community Heat Score Leaderboard</h2><p className="sub">Wards ranked by tree cover + cool-roof adoption — gamifies long-term mitigation across the city.</p>
    {rk2.map((r, rank) => <div key={r.i} className="row" style={hi === r.i ? { background: C[0] + '14', borderRadius: 8, padding: '6px 8px' } : undefined}>
      <span>{rank < 3 ? medal[rank] : '#' + (rank + 1)}&nbsp; <b>{W[r.i].n}</b>{hi === r.i ? ' (you)' : ''}</span><b style={{ color: scoreTier(r.s) }}>{r.s}/100</b></div>)}</div>;
}

/* ---------- heatwave chart ---------- */
function HeatChart({ i, adm }) {
  const { S, set, H } = useC();
  const SR = { htsi: ['HTSI', 'var(--tx)', H.hs, ''], temp: ['Temperature', '#f57c00', H.ts, '°C'], mort: ['Mortality Risk', '#8e24aa', H.mr, ''], hosp: ['Hospital Load', '#1565c0', H.hl, '%'] };
  const ks = adm ? ['htsi', 'temp', 'mort', 'hosp'] : ['htsi', 'temp'], m = ks.includes(S.hm) || S.hm == 'all' ? S.hm : 'htsi', sh = m == 'all' ? ks : [m], T = H.ts(i), Hh = H.hs(i), M = H.mr(i), Q = H.hl(i);
  const w = 340, h = 210, l = 36, r = 12, t = 14, b = 28, x = k => l + k * (w - l - r) / 4, rg = m == 'temp' ? [Math.floor(Math.min(...T)) - 2, Math.ceil(Math.max(...T)) + 2] : [0, 100];
  const nv = (k, v) => m == 'all' && k == 'temp' ? Math.max(0, Math.min(100, (v - 30) * 5)) : v, y = v => t + (1 - (v - rg[0]) / (rg[1] - rg[0])) * (h - t - b);
  const grid = m == 'temp' ? [0, 1, 2, 3, 4].map(j => rg[0] + j * (rg[1] - rg[0]) / 4) : [0, 20, 40, 60, 80, 100];
  const pk = Hh.indexOf(Math.max(...Hh)), pl = lv(Hh[pk]);
  return <>
    <div className="chips">{ks.concat('all').map(k => <span key={k} className={'chip ' + (m == k ? 'on' : '')} onClick={() => set({ hm: k })}>{k == 'all' ? 'All' : SR[k][0]}</span>)}</div>
    <p className="sub" style={{ margin: '0 0 6px' }}>Heatwave peaks on <b>Day {pk + 1}</b> · HTSI {Hh[pk]} · {AL[pl]}</p>
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
      {(m == 'htsi' || m == 'all') && [0, 1, 2, 3, 4].map(j => <rect key={j} x={l} y={y((j + 1) * 20)} width={w - l - r} height={y(j * 20) - y((j + 1) * 20)} fill={C[j]} opacity=".14" />)}
      {grid.map(v => <g key={v}><line x1={l} x2={w - r} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--bd)' }} /><text className="ct" x={l - 4} y={y(v) + 3} textAnchor="end">{Math.round(v)}</text></g>)}
      {sh.map(k => { const [, c, f, u] = SR[k], v = f(i); return <g key={k}>
        <polyline points={v.map((q, j) => x(j) + ',' + y(nv(k, q))).join(' ')} fill="none" style={{ stroke: c }} strokeWidth="2.5" strokeLinejoin="round" />
        {v.map((q, j) => <g key={j}><circle cx={x(j)} cy={y(nv(k, q))} r="4.5" style={{ fill: c, stroke: 'var(--card)' }} strokeWidth="1.5" />
          {m != 'all' && <text className="cv" x={x(j)} y={y(nv(k, q)) - 8} textAnchor="middle">{q}{u}</text>}</g>)}</g>; })}
      {[0, 1, 2, 3, 4].map(j => <text key={j} className="ct" x={x(j)} y={h - 8} textAnchor="middle">Day {j + 1}</text>)}
    </svg>
    {m == 'all' && <p className="sub">Temperature is scaled 30–50 °C → 0–100 so every line shares one axis.</p>}
    <table><tbody><tr><th>Day</th><th>Temp</th><th>HTSI</th>{adm && <><th>Mortality</th><th>Hosp. load</th></>}</tr>
      {Hh.map((q, j) => <tr key={j}><td><b>Day {j + 1}</b></td><td>{T[j]}°C</td><td>{E[lv(q)]} {q}</td>{adm && <><td>{M[j]}</td><td>{Q[j]}%</td></>}</tr>)}</tbody></table>
    <p className="sub">Simulated prototype data – shows how the model predicts the event day by day.</p></>;
}

/* ---------- Leaflet map ---------- */
function MapView({ o = {} }) {
  const ref = useRef(), c = useC();
  useEffect(() => {
    const { S, W, H, YOU, CC, set, openWard, findRoute } = c;
    const initial = S.loc ? [S.loc.la, S.loc.ln] : [28.69, 77.2], initialZoom = S.loc ? 13 : 11;
    const m = L.map(ref.current, { zoomControl: true, preferCanvas: true }).setView(initial, initialZoom);
    const rp = { referrerPolicy: 'strict-origin-when-cross-origin', crossOrigin: true };
    /* Leaflet + OpenStreetMap tiles. */
    L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', { ...rp, subdomains: 'abc', maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(m);
    const pin = (p, h, col) => L.marker(p, { icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${col}">${h}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(m);
    const lc = i => { const w = W[i]; if (S.layer == 0) return C[w.r]; const v = [0, w.e, w.o, w.p][S.layer], a = .25 + v / 100 * .75; return `rgba(21,101,192,${a.toFixed(2)})`; };
    const addHeatZone = (p, risk, label = 'Your location', wardLabel = null) => {
      const col = C[risk], radius = 500 + risk * 250;
      L.circle(p, { className: 'heatZone', radius: radius * 2.1, color: col, weight: 0, fillColor: col, fillOpacity: .06, interactive: false }).addTo(m);
      const outer = L.circle(p, { className: 'heatZone', radius, color: col, weight: 3, opacity: .7, fillColor: col, fillOpacity: .18, interactive: false }).addTo(m);
      L.circle(p, { className: 'heatZone', radius: Math.max(120, radius * .42), color: col, weight: 3, opacity: .9, fillColor: col, fillOpacity: .28, interactive: false }).addTo(m);
      L.circleMarker(p, { radius: 8, color: '#fff', weight: 3, fillColor: col, fillOpacity: 1 }).addTo(m);
      L.marker([p[0], p[1] + .010], {
        icon: L.divIcon({ className: '', html: `<div class="wardSideLabel">${wardLabel || label}</div>`, iconSize: [90, 28], iconAnchor: [0, 14] })
      }).addTo(m);
      outer.bindTooltip(`<b>${wardLabel || label}</b><br>${E[risk]} ${R[risk]} · HTSI ${H.hs(YOU)[S.hd || 0]}`, { sticky: true, direction: 'right', className: 'youLabel' });
    };
    if (!o.heat) W.forEach((w, i) => { const v = S.layer ? [0, w.e, w.o, w.p][S.layer] : w.p; L.circle(WP(i), { radius: 900 + v * 20, color: '#ffffff', weight: 1.5, opacity: .85, fillColor: lc(i), fillOpacity: .38 }).addTo(m).bindTooltip(w.n, { permanent: true, direction: 'center', className: 'wl' }).on('click', () => { set({ sel: i }); openWard(i); }); });
    if (o.heat) {
      const d = S.hd, pts = L.layerGroup(); m.fitBounds(WBOUNDS, { padding: [6, 6] });
      W.forEach((w, i) => {
        const h = H.hs(i)[d], r = lv(h), open = () => openWard(i, d), base = .8;
        const pg = L.polygon(WPOLY(i), { color: '#3a2f28', weight: 1.4, opacity: .55, lineJoin: 'round', fillColor: C[r], fillOpacity: base })
          .addTo(m).bindTooltip(`<b>${w.n}</b><br>${E[r]} ${R[r]} · HTSI ${h}<br><i>Tap for details</i>`, { sticky: true, direction: 'top' })
          .on('click', open).on('mouseover', () => pg.setStyle({ fillOpacity: .95 })).on('mouseout', () => pg.setStyle({ fillOpacity: base }));
        L.marker(WCEN(i), { icon: L.divIcon({ className: '', html: `<div class="hp" style="background:${C[r]}">W${i + 1} · ${h}</div>`, iconSize: [72, 22], iconAnchor: [36, 11] }) }).addTo(m).on('click', open);
        wardPlaces(i).forEach(p => { const ph = Math.max(0, Math.min(100, h + p.off)), pr = lv(ph);
          L.circleMarker(p.ll, { radius: 5, color: '#fff', weight: 2, fillColor: C[pr], fillOpacity: 1 }).addTo(pts)
            .bindTooltip(p.n, { permanent: true, direction: 'right', offset: [6, 0], className: 'pl' }).on('click', open); });
      });
      const zz = () => { const z = m.getZoom(); ref.current.classList.toggle('z13', z >= 13); if (z >= 12) pts.addTo(m); else pts.remove(); };
      m.on('zoomend', zz); zz();
      if (S.loc) addHeatZone([S.loc.la, S.loc.ln], lv(H.hs(YOU)[d]), 'Your location', W[YOU].n);

      /* Map chrome: title box (top-left), legend box (top-right), north arrow + scale bar (bottom-left) —
         styled after the municipal ward-wise heat map reference. */
      const TitleCtl = L.control({ position: 'topleft' });
      TitleCtl.onAdd = () => { const div = L.DomUtil.create('div', 'mapTitleBox'); L.DomEvent.disableClickPropagation(div);
        div.innerHTML = `<b>🗺️ Ward-wise Heat Map</b><span>${d ? 'Day ' + (d + 1) : 'Today'} · HTSI</span>`; return div; };
      TitleCtl.addTo(m);

      const LegendCtl = L.control({ position: 'topright' });
      LegendCtl.onAdd = () => { const div = L.DomUtil.create('div', 'mapLegendBox'); L.DomEvent.disableClickPropagation(div);
        div.innerHTML = `<b>Heat Map Legend</b>` + R.map((r, i) => `<div class="mapLegendRow"><i style="background:${C[i]}"></i>${r} (${RG[i]})</div>`).join('');
        return div; };
      LegendCtl.addTo(m);

      L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 110 }).addTo(m);
      const NorthCtl = L.control({ position: 'bottomleft' });
      NorthCtl.onAdd = () => { const div = L.DomUtil.create('div', 'mapNorthArrow'); div.innerHTML = '⬆<span>N</span>'; return div; };
      NorthCtl.addTo(m);
    }
    if (o.you) {
      const p = S.loc ? [S.loc.la, S.loc.ln] : WP(YOU), r = lv(H.hs(YOU)[0]); m.setView(p, S.loc ? 13 : 12);
      if (S.loc && S.loc.ac) L.circle(p, { radius: Math.max(20, S.loc.ac), color: '#1565c0', weight: 1, fillOpacity: .05 }).addTo(m);
      addHeatZone(p, r, 'Your location', W[YOU].n);
      pin(p, '📍', '#b3261e').bindPopup(`<b>Your location</b><br>${W[YOU].n}<br>${E[r]} ${R[r]} heat risk<br>HTSI ${H.hs(YOU)[0]}/100`);
    }
    const tm = setTimeout(() => m.invalidateSize(), 200);
    if (o.route) {
      const t = S.rt || {}, org = RO(S.loc, YOU); m.setView(org, 13);
      CC.forEach(cc => pin(cc.ll, '❄', '#1565c0').bindPopup(`<b>${cc.n}</b><br>${cc.addr}<br>🕒 ${cc.hr}`));
      WT.forEach(w => pin(w.ll, '💧', '#0288d1').bindPopup(`<b>${w.n}</b><br>Free drinking water`));
      pin(org, '📍', '#b3261e'); if (S.rd) pin(S.rd, '🏁', '#2e7d32');
      if (t.n) {
        const ls = { n: ['#607d8b', '8 8'], h: ['#2e7d32', null] }, pl = [];
        (t.same ? ['n'] : ['n', 'h']).sort((a, b) => (a == t.sel) - (b == t.sel)).forEach(k => pl.push(L.polyline(t[k].ll, { color: t.same ? '#2e7d32' : ls[k][0], weight: k == t.sel ? 7 : 4, opacity: k == t.sel ? .95 : .55, dashArray: ls[k][1] }).addTo(m)));
        m.fitBounds(L.featureGroup(pl).getBounds().pad(.15));
      }
      m.on('click', e => { const d = [e.latlng.lat, e.latlng.lng]; set({ rd: d, rdn: 'Dropped pin', rdi: '' }); findRoute(d); });
    }
    if (o.pins) {
      CC.forEach(cc => pin(cc.ll, '❄', '#1565c0').bindPopup(`<b>${cc.n}</b><br>${cc.addr}<br>🕒 ${cc.hr}<br>📞 <a href="${tel(cc)}">${cc.ph}</a>`));
      if (S.facil) HF.forEach(h => pin(h.ll, '+', '#b3261e').bindPopup(`<b>🏥 ${h.n}</b><br>${h.addr}<br>🛏️ ${h.bed} beds · ${h.avail} available<br>🚑 Emergency: ${h.erAvail}/${h.er} available<br>📞 <a href="${tel(h)}">${h.ph}</a><br><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.addr)}" target="_blank" rel="noopener">🧭 Directions</a>`));
    }
    return () => { clearTimeout(tm); m.remove(); };
    // eslint-disable-next-line
  }, [JSON.stringify(o), c.S.layer, c.S.hd, c.S.loc, c.YOU, c.W, c.CC, c.S.facil, c.S.rt, c.S.rd]);
  return <div ref={ref} id="lm" className="lmap"></div>;
}

/* Reverse-geocode the GPS point into a readable place name (OpenStreetMap Nominatim) */
function usePlace(loc) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!loc) { setName(''); return; }
    let dead = false; setName('');
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&addressdetails=1&accept-language=en&lat=${loc.la}&lon=${loc.ln}`)
      .then(r => r.json()).then(d => {
        const a = d.address || {};
        const parts = [a.neighbourhood || a.residential || a.quarter || a.road, a.suburb || a.city_district || a.village || a.town, a.city || a.state_district || a.county].filter(Boolean);
        const uniq = parts.filter((x, k) => parts.indexOf(x) === k).slice(0, 3);
        const n = uniq.length ? uniq.join(', ') : (d.display_name || '').split(',').slice(0, 3).join(',').trim();
        if (!dead) setName(n || 'unknown');
      }).catch(() => { if (!dead) setName('unknown'); });
    return () => { dead = true; };
  }, [loc && loc.la, loc && loc.ln]);
  return name;
}

function LocCard() {
  const { S, W, YOU } = useC(), place = usePlace(S.loc);
  return <div className="card"><h2>📍 Your location</h2>{S.loc ? <>
    <p className="sub" style={{ margin: '0 0 6px' }}>Your current location and surrounding heat-risk zone</p>
    <div className="mapw"><MapView o={{ you: 1 }} /></div><Legend />
    <div className="row" style={{ marginTop: 8 }}><span>Place</span><b style={{ textAlign: 'right', maxWidth: '70%' }}>{place === '' ? 'Finding place name…' : place === 'unknown' ? S.loc.la.toFixed(4) + ', ' + S.loc.ln.toFixed(4) : place}</b></div>
    <div className="row"><span>Your ward</span><b>{W[YOU].n}</b></div>
    <div className="row"><span>Heat risk here</span><Badge r={W[YOU].r} /></div></> : <p className="sub">Allow location access to find your ward.</p>}</div>;
}

function HeatCard() {
  const { S, set } = useC();
  return <><div className="card"><h2>🔥 City Heat Map · HTSI</h2><p className="sub">Each ward is shown separately — red = hotter, green = cooler. Tap a ward for its heat details and the areas it covers (zoom in to see area names).</p>
    <div className="chips">{[0, 1, 2, 3, 4].map(k => <span key={k} className={'chip ' + (S.hd == k ? 'on' : '')} onClick={() => set({ hd: k })}>{k ? 'Day ' + (k + 1) : 'Today'}</span>)}</div>
    <div className="mapw"><MapView o={{ heat: 1 }} /></div><div className="hg" style={{ marginTop: 8 }}></div><Legend /></div>
    <div className="card"><h2>🚦 HTSI Risk Scale &amp; User Alerts</h2><Scale c={-1} /></div></>;
}

/* ---------- cooling centers / safest time ---------- */
function CCCard({ c }) {
  const { W } = useC(), full = c.occ >= c.cap, op = isOpen(c);
  const bg = (t, ok) => <span className="badge" style={{ color: ok ? '#2e7d32' : '#d32f2f', borderColor: 'currentColor' }}>{t}</span>;
  return <div className="card"><div className="top"><b>{c.n}</b><span>{bg(op ? 'Open now' : 'Closed', op)} {bg(full ? 'Full' : 'Available', !full)}</span></div>
    <div className="sub" style={{ marginTop: 4 }}>📍 {c.addr} · {W[c.ward].n}</div><div className="sub">{c.d} away · 🕒 {c.hr}</div>
    <div className="bar" style={{ margin: '8px 0 4px' }}><i style={{ width: c.occ / c.cap * 100 + '%', background: 'var(--acc)' }}></i></div>
    <div className="sub">{c.occ}/{c.cap} occupied · {c.cap - c.occ} places free</div>
    <div className="chips" style={{ marginTop: 8 }}>{c.fac.map(f => <span key={f} className="chip">{f}</span>)}</div>
    <div className="row"><span>In-charge</span><b>{c.inc}</b></div>
    <div className="row"><span>Contact</span><b><a href={tel(c)} style={{ color: 'var(--acc)' }}>{c.ph}</a></b></div>
    <a className="btn s a" href={tel(c)}>📞 Call</a> <a className="btn s" style={{ background: '#2e7d32' }} href={`https://www.google.com/maps/dir/?api=1&destination=${c.ll}`} target="_blank" rel="noopener">🧭 Directions</a></div>;
}

function SafeTimeCard() {
  const { S, set, W, YOU } = useC(), H = safeHours(W, YOU, S.age, S.job), { lvl, idx } = bestSlot(H), per = S.age !== 'Adult' || S.job === 'Outdoor';
  return <div className="card"><h2>🕐 Safest Time to Go Outside</h2><p className="sub">{W[YOU].n} today{per ? ' · adjusted for your age/work profile' : ''}</p>
    <button className="btn s a" onClick={() => set({ stOpen: !S.stOpen })}>{S.stOpen ? 'Hide times' : '🚶 I need to go outside'}</button>
    {S.stOpen && <><table style={{ marginTop: 10 }}><tbody><tr><th>Time</th><th>Risk</th></tr>{H.map(h => <tr key={h.hr}><td>{h.t}</td><td>{E[lv(h.v)]} {R[lv(h.v)]}</td></tr>)}</tbody></table>
      <div className="row" style={{ border: 0, paddingTop: 10 }}><span>{lvl <= 1 ? '✅ Recommended time' : '⚠️ Least risky window'}</span><b style={{ color: C[lvl] }}>{HWIN[H[idx].hr]}</b></div>
      {lvl >= 3 && <p className="sub">Even the safest window today is risky — limit time outside, carry water and take shade breaks.</p>}</>}</div>;
}

/* ---------- Heat-safe route ---------- */
function RouteRes() {
  const { S, set, YOU } = useC(), t = S.rt;
  if (!t) return null;
  if (t.busy) return <div className="card sub">⏳ Finding the shortest and the coolest route…</div>;
  if (t.err) return <div className="card sub" style={{ color: 'var(--pri)' }}>{t.err}</div>;
  const n = t.n, h = t.h, dk = (h.km - n.km).toFixed(1), ok = (c, y, no) => <li style={{ padding: '3px 0' }}>{c ? '✅' : '➖'} {c ? y : no}</li>;
  const dir = () => { const r = t[t.sel]; if (!r) return; const q = p => p[0].toFixed(5) + ',' + p[1].toFixed(5), ll = r.ll, wp = t.sel == 'h' && !t.same ? [.25, .5, .75].map(f => q(ll[Math.floor(f * (ll.length - 1))])).join('|') : ''; window.open('https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + q(RO(S.loc, YOU)) + '&destination=' + q(S.rd) + (wp ? '&waypoints=' + encodeURIComponent(wp) : ''), '_blank', 'noopener'); };
  return <div className="card"><h2>📏 Route comparison → {S.rdn || 'Destination'}</h2>
    <div className="row"><span>Normal route</span><b>{n.km.toFixed(1)} km · {n.min} min</b></div>
    <div className="row"><span>Heat-safe route</span><b style={{ color: '#2e7d32' }}>{h.km.toFixed(1)} km · {h.min} min</b></div>
    <p className="sub">{t.same ? 'The shortest route is already the coolest option found for this trip.' : (+dk > 0 ? `Heat-safe route is ${dk} km longer` : 'Heat-safe route is not longer') + ' but avoids the hottest zones.'}</p>
    <h2 style={{ marginTop: 10 }}>🌿 Heat-safe route</h2>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {ok(h.sh > n.sh, `More shaded roads (~${h.sh}% shade vs ${n.sh}%)`, `Shade similar (~${h.sh}%)`)}
      {ok(h.ccd < 600, `Cooling center nearby: ${h.cc.n} (${h.ccd} m from route)`, `Nearest cooling center: ${h.cc.n}, ${(h.ccd / 1000).toFixed(1)} km away`)}
      {ok(h.wp > 0, `${h.wp} water point${h.wp > 1 ? 's' : ''} on route`, 'No water points on route – carry water')}
      {ok(h.h < n.h, `Lower HTSI zones (avg ${h.h} vs ${n.h})`, `HTSI similar (avg ${h.h})`)}</ul>
    <div className="chips" style={{ marginTop: 10 }}>{!t.same && <><span className={'chip ' + (t.sel == 'n' ? 'on' : '')} onClick={() => set(s => ({ rt: { ...s.rt, sel: 'n' } }))}>Normal</span><span className={'chip ' + (t.sel == 'h' ? 'on' : '')} onClick={() => set(s => ({ rt: { ...s.rt, sel: 'h' } }))}>Heat-safe</span></>}</div>
    <button className="btn a" onClick={dir}>🧭 Get Directions</button><p className="sub">Routes: OpenStreetMap. Shade, HTSI and water-point values are simulated prototype data.</p></div>;
}

function RouteTab() {
  const { S, set, CC, findRoute, rsearch } = useC(), D = DEST(CC);
  return <><div className="card"><h2>🧭 Heat-Safe Route</h2><p className="sub">Choose where you are going. We compare the shortest walk with a cooler route.</p>
    <select value={S.rdi === '' || S.rdi === undefined ? '' : S.rdi} onChange={e => { const v = e.target.value; if (v !== '') { const d = D[+v]; set({ rd: d.ll, rdn: d.n.replace(/^\S+\s/, ''), rdi: +v }); findRoute(d.ll); } }}>
      <option value="">Choose destination…</option>{D.map((d, i) => <option key={i} value={i}>{d.n}</option>)}</select>
    <div style={{ display: 'flex', gap: 6 }}><input id="rq" placeholder="Or search a place (e.g. India Gate)" value={S.rq || ''} onChange={e => set({ rq: e.target.value })} onKeyDown={e => e.key == 'Enter' && rsearch()} />
      <button className="btn a" style={{ marginBottom: 10 }} onClick={rsearch}>Search</button></div>
    <p className="sub" style={{ marginTop: 0 }}>…or tap anywhere on the map to drop a destination pin.</p>
    <div className="mapw"><MapView o={{ route: 1 }} /></div>
    <div className="leg"><span><i style={{ background: '#607d8b' }}></i>Normal</span><span><i style={{ background: '#2e7d32' }}></i>Heat-safe</span><span>❄ Cooling center</span><span>💧 Water point</span></div></div><RouteRes /></>;
}

/* ---------- SOS ---------- */
function SosHome() {
  const { sos } = useC();
  return <div className="card" style={{ textAlign: 'center', background: '#b3261e12', borderColor: '#b3261e' }}><h2 style={{ color: '#b3261e' }}>🆘 Heat Emergency</h2><p className="sub">Tap to alert the city control room and message your emergency contact with your live location — instantly.</p><button className="sosBtn" onClick={sos} aria-label="Heat Emergency SOS">🆘</button></div>;
}
function SosCard() {
  const { S, set, toast } = useC();
  if (!S.sos.length) return null;
  return <div className="card al" style={{ borderLeftColor: '#b3261e' }}><h2>🆘 Live SOS Requests ({S.sos.length})</h2>
    {S.sos.map((s, i) => <div key={i} className="row"><div><b>{s.name}</b><br /><span className="sub">{s.loc}</span><br /><span className="sub">{s.age}{s.cond ? ' · ' + s.cond : ''} · {s.time}</span></div>
      <div><a className="btn s" style={{ background: '#b3261e' }} href="tel:108">📞 108</a> <button className="btn s a" onClick={() => { set(x => ({ sos: x.sos.filter((_, k) => k != i) })); toast('Marked resolved'); }}>Resolve</button></div></div>)}</div>;
}

/* ---------- guides / chatbot ---------- */
function InfoCard({ h, a, c }) {
  return <div className="card" style={c ? { borderLeft: '4px solid ' + c } : undefined}><h2>{h}</h2><Ul>{a.map((x, i) => <li key={i} dangerouslySetInnerHTML={{ __html: x }} />)}</Ul></div>;
}
function LangBar() {
  const { S, set } = useC();
  return <div className="chips">{Object.keys(LN).map(k => <span key={k} className={'chip ' + (S.lang == k ? 'on' : '')} onClick={() => set({ lang: k })}>{LN[k]}</span>)}</div>;
}
function Safety() {
  const { S } = useC(), d = SF[S.lang];
  return <><LangBar /><div className="card al" style={{ borderLeftColor: C[4] }}><b>{d[0]}</b><p className="sub" style={{ margin: '4px 0 0' }}>{d[1]}</p></div>{d.slice(2).map((x, i) => <InfoCard key={i} h={x[0]} a={x[1]} c={C[SC[i]]} />)}</>;
}
function Guide() {
  const { S } = useC(), d = GD[S.lang] || GD.en;
  return <><LangBar />{GD[S.lang] ? null : <p className="sub">Guide is available in English and Hindi; showing English.</p>}{d.map((x, i) => <InfoCard key={i} h={x[0]} a={x[1]} c={C[GC[i]]} />)}</>;
}

const greet = role => role == 'a' ? 'Hello! Ask me how to protect people from heatstroke.' : 'Hi! Tell me your symptoms (e.g. "mujhe chakkar aa raha hai") or ask anything about staying safe in the heat 🌞';
function Bot() {
  const { S, set, ask, symRoute } = useC(), [txt, setTxt] = useState(''), bm = useRef();
  const msgs = S.chat.length ? S.chat : [{ f: 'b', t: greet(S.role) }];
  const qs = S.role == 'a' ? ['Basics', 'Action steps', 'Cooling centers', 'Hospitals'] : ['Mujhe chakkar aa raha hai', 'Symptoms', 'First aid', 'Helpline'];
  useEffect(() => { if (bm.current) bm.current.scrollTop = 1e9; }, [S.chat, S.bo]);
  return <div id="bot"><div id="bp" className={S.bo ? 'on' : ''}><header>🤖 Heat Helper</header>
    <div id="bm" ref={bm}>{msgs.map((m, i) => <div key={i} className={'m ' + m.f}>{typeof m.t == 'string' ? m.t : (() => { const { severe, steps, target, kind } = m.t.sym; return <>
      <b>{severe ? '⚠️ This could be heatstroke — act fast.' : 'This sounds like heat exhaustion.'}</b>
      <ul style={{ margin: '6px 0', paddingLeft: 16 }}>{steps.map((s, k) => <li key={k}>{s}</li>)}</ul>
      <button className="btn s a" style={{ marginTop: 2 }} onClick={() => symRoute(target)}>🧭 Route to nearest {kind} — {target.n} ({target.d.toFixed(1)} km)</button></>; })()}</div>)}</div>
    <div className="chips">{qs.map(q => <span key={q} className="chip" onClick={() => ask(q)}>{q}</span>)}</div>
    <input id="bi" placeholder="Type your question" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key == 'Enter') { ask(txt); setTxt(''); } }} /></div>
    <button id="bf" onClick={() => set(s => ({ bo: !s.bo }))} aria-label="Chatbot">🤖</button></div>;
}

/* ---------- shell / login / profile ---------- */
function Shell({ title, sub, tabs, hero, h1, h2, children }) {
  const { S, set, goTab, logout } = useC();
  return <div className={S.role == 'a' ? 'adm' : ''}>
    <div className="hero" style={{ '--h1': h1, '--h2': h2 }}><div className="top"><div><small>{sub}</small><h1>{title}</h1></div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{S.role == 'c' && <button className="btn g" aria-label="Your Profile" onClick={() => set({ profileOpen: true })}>👤 Profile</button>}<button className="btn g" onClick={logout}>Logout</button></div></div>{hero}</div>
    <div className="wrap up">{children}</div>
    <div className="tabs">{tabs.map((t, i) => <button key={i} className={S.tab == i ? 'on' : ''} onClick={() => goTab(i)}><b>{t[0]}</b>{t[1]}</button>)}</div></div>;
}

function Login() {
  const { S, set, doLogin } = useC(), [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), ad = S.lr == 'a';
  const role = r => { set({ lr: r }); setU(''); setP(''); setErr(''); };
  const go = () => { const uu = u.trim(), pp = p.trim(); if (ad ? (!uu || !pp) : (!uu || !/^\d{10}$/.test(pp))) { setErr(ad ? 'Enter Employee ID and password.' : 'Enter your name and a valid 10-digit mobile number.'); return; } doLogin(uu, pp); };
  const key = e => e.key == 'Enter' && go();
  return <div className="lgPage"><div className="lgCard">
    <div className="lgBrand"><span>🌡️</span><b>TaapRakshak</b></div>
    <div className="lgHead"><h1>Welcome back</h1><p>Login to your TaapRakshak account</p></div>
    <div className="lgBody">
      <div className="lgRoles"><button className={!ad ? 'on' : ''} onClick={() => role('c')}><span>👤</span>Citizen</button><button className={ad ? 'on' : ''} onClick={() => role('a')}><span>🛡️</span>Authority</button></div>
      <label className="lgLb" htmlFor="u">{ad ? 'Employee ID' : 'Your name'}</label>
      <input id="u" className="lgIn" placeholder={ad ? 'e.g. MCD-10234' : 'e.g. Rina Khonglah'} value={u} onChange={e => setU(e.target.value)} onKeyDown={key} />
      <label className="lgLb" htmlFor="p">{ad ? 'Password' : 'Mobile number'}</label>
      {ad ? <input id="p" className="lgIn" type="password" placeholder="Enter your password" value={p} onChange={e => setP(e.target.value)} onKeyDown={key} />
        : <input id="p" className="lgIn" inputMode="numeric" maxLength="10" placeholder="+91 9XXXXXXXXX" value={p} onChange={e => setP(e.target.value)} onKeyDown={key} />}
      <div id="err" className="lgErr">{err}</div>
      <button className="lgBtn" onClick={go}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>Login</button>
      <p className="lgDemo">Demo build – any valid-format input works.</p>
    </div></div></div>;
}

function Field({ id, label, ph, val, onCommit, ...rest }) {
  return <><label className="lb" htmlFor={id}>{label}</label><input id={id} placeholder={ph} key={val} defaultValue={val || ''} onBlur={e => onCommit(e.target.value)} onKeyDown={e => e.key == 'Enter' && e.target.blur()} {...rest} /></>;
}
function Profile() {
  const { S, set, personal } = useC();
  return <><div className="hero" style={{ '--h1': '#1565c0', '--h2': '#0d3b66' }}><div className="top"><div><small>👤 Profile</small><h1>My Details</h1></div><button className="btn g" onClick={() => set({ profileOpen: false })}>← Back</button></div></div>
    <div className="wrap up">
      <div className="card"><h2>🧑 Basic Details</h2>
        <Field id="pf-name" label="Full name" ph="e.g. Ramesh Kumar" val={S.name} onCommit={v => set({ name: v.trim() })} />
        <Field id="pf-phone" label="Phone number" ph="10-digit mobile number" val={S.phone} inputMode="numeric" maxLength="10" onCommit={v => set({ phone: v.replace(/\D/g, '').slice(0, 10) })} />
        <label className="lb" htmlFor="pf-age">Age group</label><select id="pf-age" value={S.age} onChange={e => set({ age: e.target.value })}><option>Adult</option><option>Elderly</option><option>Child</option></select>
        <label className="lb" htmlFor="pf-job">Occupation type</label><select id="pf-job" value={S.job} onChange={e => set({ job: e.target.value })}><option>Indoor</option><option>Outdoor</option></select>
        <div className="row"><span>Personal heat risk</span><Badge r={personal()} /></div></div>
      <div className="card"><h2>🩺 Medical Conditions</h2><p className="sub">Optional – helps responders if you use Heat SOS.</p>
        <Field id="pf-cond" label="Conditions / allergies" ph="e.g. Diabetes, Asthma, None" val={S.cond} onCommit={v => set({ cond: v.trim() })} /></div>
      <div className="card"><h2>🆘 Emergency Info</h2><p className="sub">Used only by the one-tap Heat SOS button to alert your contact and share your location.</p>
        <Field id="pf-ecname" label="Emergency contact name" ph="e.g. Sunita Kumar" val={S.ecName} onCommit={v => set({ ecName: v.trim() })} />
        <Field id="pf-ecphone" label="Emergency contact WhatsApp number" ph="10-digit WhatsApp number" val={S.ecPhone} inputMode="numeric" maxLength="10" onCommit={v => set({ ecPhone: v.replace(/\D/g, '').slice(0, 10) })} /></div>
    </div></>;
}

/* ---------- modal ---------- */
function Modal() {
  const { modal, setModal, S, W, H, YOU, CC } = useC(), close = () => setModal(null);
  useEffect(() => { const f = e => { if (e.key == 'Escape') setModal(null); }; document.addEventListener('keydown', f); return () => document.removeEventListener('keydown', f); }, [setModal]);
  let bc, body = null;
  if (modal && modal.type == 'ward') {
    const { i, d } = modal, w = W[i], a = S.role == 'a', h = H.hs(i)[d], r = lv(h); bc = C[r];
    body = <><button id="mx" aria-label="Close" onClick={close}>✕</button><h2>{w.n}{i == YOU ? ' (your ward)' : ''}</h2>{d ? <p className="sub">{day[d]} forecast</p> : null}
      <div className="row"><span>HTSI score</span><b>{h}/100</b></div><div className="bar" style={{ marginBottom: 4 }}><i style={{ width: h + '%', background: C[r] }}></i></div>
      <div className="row"><span>Thermal stress</span><Badge r={r} /></div>
      {!d && <><div className="row"><span>Air quality (AQI)</span><AqBadge l={aqLv(w.aqi)} /></div><div className="row"><span>Outdoor Safety Index</span><Badge r={H.osiLv(i)} /></div></>}
      <div className="row"><span>Alert level</span><b style={{ textAlign: 'right' }}>{AL[r]}</b></div>
      <div className="row"><span>Health risk</span><Badge r={Math.max(0, r - 1)} /></div>
      <div className="row"><span>Temperature</span><b>{H.ts(i)[d]}°C</b></div><div className="row"><span>Humidity</span><b>{w.h}%</b></div>
      <div className="row"><span>Elderly density</span><b>{w.e}%</b></div><div className="row"><span>Outdoor workers</span><b>{w.o}%</b></div><div className="row"><span>Population density</span><b>{w.p}%</b></div>
      <div className="row"><span>5-day outlook</span><span>{H.fc(i).map(x => E[x]).join(' ')}</span></div>
      <h2 style={{ margin: '14px 0 4px', fontSize: 14 }}>📍 Areas covered in {w.n} ({wardPlaces(i).length})</h2>
      {wardPlaces(i).map(p => { const ph = Math.max(0, Math.min(100, h + p.off)), pr = lv(ph); return <div key={p.n} className="row"><div><b>{p.n}</b><br /><span className="sub">{LK[p.k]}</span></div><span className="badge" style={{ color: C[pr], background: C[pr] + '22', borderColor: C[pr] }}>{E[pr]} {ph}</span></div>; })}
      {CC.filter(c => c.ward == i).length > 0 && <><b className="sub">🧊 Cooling centers in this ward</b>{CC.filter(c => c.ward == i).map(c => <div key={c.n} className="row"><div><b>{c.n}</b><br /><span className="sub">{c.addr} · {c.hr}</span></div><span className="sub">{c.occ}/{c.cap}</span></div>)}</>}
      <p className="sub" style={{ marginTop: 4 }}>Area scores are estimated from the ward's HTSI; area list is indicative.</p>
      {a ? <><div className="row"><span>Mortality risk index</span><b>{H.mr(i)[d]}/100</b></div><div className="row"><span>Hospital load</span><b>{H.hl(i)[d]}%</b></div>
        <div className="row"><span>Suggested action</span><b style={{ textAlign: 'right' }}>{['Monitor', 'Monitor', 'Public advisory', 'Cooling center + alert', 'Emergency response'][r]}</b></div></>
        : <p className="sub">{['Heat is normal today. Keep drinking water.', 'Avoid long exposure to the sun.', 'Stay indoors 12–4 PM.', 'Avoid outdoor work; look after the elderly.', 'Extreme heat! Stay home or go to a cooling center.'][r]}</p>}</>;
  } else if (modal && modal.type == 'sos') {
    const { gps, wa, mapLink } = modal; bc = '#b3261e';
    body = <><button id="mx" aria-label="Close" onClick={close}>✕</button><h2>🆘 Heat Emergency SOS</h2>
      <p className="sub">{wa ? 'Your location and details were just sent to the city control room, and WhatsApp opened automatically to alert your emergency contact — tap Send there to finish.' : 'Your location and basic medical profile were just sent to the city control room.'}</p>
      <div className="card" style={{ background: '#b3261e12', borderColor: '#b3261e' }}>
        <div className="row"><span>Name</span><b>{S.name || '—'}</b></div><div className="row"><span>Age group</span><b>{S.age}</b></div>
        <div className="row"><span>Medical conditions</span><b>{S.cond || 'None noted'}</b></div><div className="row"><span>Location</span><b>{gps ? 'GPS locked' : 'Approx. (ward center)'}</b></div></div>
      <a className="btn" style={{ background: '#b3261e', width: '100%', marginTop: 10, textAlign: 'center', display: 'block' }} href="tel:108">📞 Call 108 Ambulance</a>
      {wa ? <a className="btn a" style={{ width: '100%', marginTop: 8, textAlign: 'center', display: 'block' }} href={wa} target="_blank" rel="noopener">💬 Reopen WhatsApp alert to {S.ecName || 'Emergency Contact'}</a>
        : <p className="sub" style={{ marginTop: 8 }}>Add an emergency contact number in your Profile to enable instant WhatsApp alerts.</p>}
      <a className="btn s" style={{ background: 'var(--bd)', color: 'var(--tx)', width: '100%', marginTop: 8, textAlign: 'center', display: 'block' }} href={mapLink} target="_blank" rel="noopener">📍 Share My Location</a></>;
  }
  return <div id="modal" className={modal ? 'on' : ''} onClick={e => { if (e.target.id == 'modal') close(); }}><div id="mb" style={bc ? { borderTopColor: bc } : undefined}>{body}</div></div>;
}

/* ---------- Citizen ---------- */
function Citizen() {
  const { S, set, W, H, YOU, CC } = useC();
  if (S.profileOpen) return <Profile />;
  const w = W[YOU], t = S.tab; let hero = null, b = null;
  if (t == 0) {
    hero = <div className="grid3" style={{ marginTop: 14, textAlign: 'left' }}><div><b style={{ fontSize: 20 }}>{S.wx ? S.wx.t : w.t}°C</b><br /><small>Temp</small></div><div><b style={{ fontSize: 20 }}>{S.wx ? S.wx.h : w.h}%</b><br /><small>Humidity</small></div><div><b style={{ fontSize: 20 }}>{S.wx ? S.wx.w : 5}</b><br /><small>Wind km/h</small></div></div>;
    b = <><LocCard /><SosHome /><SafeTimeCard />
      <div className="grid"><div className="card"><div className="sub">🔥 Thermal Stress</div><Badge r={w.r} /></div><div className="card"><div className="sub">⚠️ Health Risk</div><Badge r={Math.max(0, w.r - 1)} /></div></div>
      <div className="card"><h2>🔥 HTSI Score</h2><div className="row"><span style={{ fontSize: 34, fontWeight: 800, color: C[w.r] }}>{w.htsi}<small className="sub">/100</small></span><Badge r={w.r} /></div>
        <div className="bar" style={{ margin: '4px 0 8px' }}><i style={{ width: w.htsi + '%', background: C[w.r] }}></i></div><div className="row"><span>Alert for your area</span><b>{AL[w.r]}</b></div><Scale c={w.r} /></div>
      <OsiCard i={YOU} />
      <div className="card"><h2>🌡️ Thermal Stress Details</h2><div className="row"><span>WBGT</span><Badge r={3} /></div><div className="row"><span>UTCI</span><Badge r={3} /></div><div className="row"><span>Heat Index</span><Badge r={4} /></div><div className="row"><span>Solar radiation</span><b>High</b></div>
        <button className="btn s a" onClick={() => set({ why: !S.why })}>{S.why ? 'Hide' : 'Why is my risk high?'}</button>{S.why && <p className="sub">High temperature with high humidity and low wind reduces the body’s ability to cool through sweating, pushing thermal stress up.</p>}</div>
      <div className="card"><h2>🩺 Today’s Advice</h2><p className="sub">Heat-safety guidance, not medical diagnosis.</p><Ul><li>Avoid prolonged outdoor exposure</li><li>Stay hydrated even if not thirsty</li><li>Take cooling/rest breaks</li><li>Avoid peak afternoon heat (12–4 PM)</li></Ul></div></>;
  }
  if (t == 1) b = <><LocCard /><MyScoreCard i={YOU} /><LeaderboardCard hi={YOU} /></>;
  if (t == 2) b = <><div className="card"><h2>🌊 Heatwave Prediction · {w.n}</h2><HeatChart i={YOU} adm={0} /></div>
    <div className="card"><h2>📅 5-Day Forecast · {w.n}</h2>{H.fc(YOU).map((r, k) => <div key={k} className="row"><b>{day[k]}</b><Badge r={r} /><span className="sub">HTSI {H.hs(YOU)[k]} · {H.ts(YOU)[k]}°C</span></div>)}</div>
    <div className="card"><h2>📊 Personal Heat History</h2>{[['25 Sept', 2], ['24 Sept', 1], ['23 Sept', 2], ['22 Sept', 0]].map(h => <div key={h[0]} className="row"><span>{h[0]}</span><Badge r={h[1]} /></div>)}</div></>;
  if (t == 3) b = <><div className="card"><h2>📍 Nearby</h2><label className="c"><input type="checkbox" checked={S.facil} onChange={e => set({ facil: e.target.checked })} />Show hospitals</label>
    <div className="mapw" style={{ marginTop: 8 }}><MapView o={{ pins: 1, you: 1 }} /></div><p className="sub">❄ Cooling center · + Health facility</p></div>
    <h2>🧊 Cooling Centers</h2>{CC.map(c => <CCCard key={c.n} c={c} />)}
    <h2>🏥 Nearby Health Facilities</h2>{HF.map(h => <div key={h.n} className="card"><div className="top"><b>🏥 {h.n}</b><span className="badge" style={{ color: h.avail > 0 ? '#2e7d32' : '#d32f2f', borderColor: h.avail > 0 ? '#2e7d32' : '#d32f2f' }}>{h.avail > 0 ? 'Beds Available' : 'Full'}</span></div><div className="sub" style={{ marginTop: 4 }}>📍 {h.addr}</div><div className="sub">{h.t} · {h.d}</div><div className="grid" style={{ marginTop: 8 }}><div className="tile"><b>{h.avail}/{h.bed}</b><span className="sub">Beds available</span></div><div className="tile"><b>{h.icuAvail}/{h.icu}</b><span className="sub">ICU available</span></div><div className="tile"><b>{h.erAvail}/{h.er}</b><span className="sub">Emergency</span></div></div><div className="row"><span>Hospital load</span><b>{h.load}%</b></div><div className="row"><span>Ventilators</span><b>{h.ventAvail}/{h.vent} available</b></div><div className="sub" style={{ marginTop: 6 }}>Prototype availability data · verify live availability before admission.</div><a className="btn s a" href={tel(h)}>📞 Call</a> <a className="btn s" style={{ background: '#2e7d32' }} href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.addr)}`} target="_blank" rel="noopener">🧭 Directions</a></div>)};</>
  if (t == 6) b = <RouteTab />;
  if (t == 5) b = <><h2>🛡️ Heatstroke Safety</h2><Safety /><Bot /></>;
  if (t == 4) b = <><h2>🔔 Heat Alerts</h2>
    <div className="card al" style={{ borderLeftColor: C[4] }}><b>🚨 EMERGENCY HEAT ALERT</b><p className="sub">Your ward is expected to see extreme thermal stress tomorrow. Take heat-safety precautions.</p><span className="sub">2 hours ago</span></div>
    <div className="card al" style={{ borderLeftColor: C[3] }}><b>🚨 STRONG HEAT ALERT</b><p className="sub">Thermal stress stays very high this afternoon. Limit outdoor activity.</p><span className="sub">Yesterday</span></div>
    {S.alerts.map((a, i) => <div key={i} className="card al" style={{ borderLeftColor: C[a.r] }}><b>{AL[a.r].toUpperCase()} – {W[a.w % 16].n}</b><p className="sub">Via {a.ch}</p></div>)}</>;
  return <Shell title={t == 0 ? 'Hi' + (S.name ? ', ' + S.name.split(' ')[0] : '') + ' · ' + w.n : ['', 'My Area', 'Forecast', 'Cooling & Health', 'Alerts', 'Safety', 'Heat-Safe Route'][t]} sub="📍 Your location"
    tabs={[['🏠', 'Home'], ['🗺️', 'Map'], ['📅', 'Forecast'], ['❄️', 'Cooling'], ['🔔', 'Alerts'], ['🛡️', 'Safety'], ['🧭', 'Route']]} hero={hero} h1={C[w.r]} h2="#3a1010">{b}</Shell>;
}

/* ---------- Admin ---------- */
function AlertForm() {
  const { S, W, set, toast } = useC(), [aw, setAw] = useState(0), [ar, setAr] = useState(4), [aa, setAa] = useState('Residents'), [ch, setCh] = useState({ SMS: true, WhatsApp: true, App: false });
  const send = () => { const c = Object.keys(ch).filter(k => ch[k]).join(', '); if (!c) { toast('Pick at least one channel'); return; } set(s => ({ alerts: [{ w: aw, r: ar, aud: aa, ch: c }, ...s.alerts] })); toast('Alert sent'); };
  return <div className="card"><h2>🚨 Create Alert</h2>
    <select id="aw" value={aw} onChange={e => setAw(+e.target.value)}>{W.map((x, i) => <option key={i} value={i}>{x.n}</option>)}</select>
    <select id="ar" value={ar} onChange={e => setAr(+e.target.value)}>{R.map((r, i) => i ? <option key={i} value={i}>{r} · HTSI {RG[i]} · {AL[i]}</option> : null)}</select>
    <select id="aa" value={aa} onChange={e => setAa(e.target.value)}><option>Residents</option><option>Outdoor Workers</option><option>Elderly</option></select>
    {['SMS', 'WhatsApp', 'App'].map(k => <label key={k} className="c"><input type="checkbox" className="ch" value={k} checked={ch[k]} onChange={e => setCh(o => ({ ...o, [k]: e.target.checked }))} />{k}</label>)}<br />
    <button className="btn a" style={{ marginTop: 8 }} onClick={send}>Send Alert</button>
    {S.alerts.map((a, i) => <div key={i} className="row"><span>{W[a.w % 16].n} · {a.aud}<br /><span className="sub">{a.ch}</span></span><Badge r={a.r} /></div>)}</div>;
}

function Admin() {
  const { S, set, W, H, CC, toast, green, occ } = useC(), t = S.tab, w = W[S.sel], cnt = R.map((_, r) => W.filter(x => x.r == r).length);
  let hero = null, b = null;
  const wardSel = score => <select value={S.sel} onChange={e => set({ sel: +e.target.value })}>{W.map((x, i) => <option key={i} value={i}>{x.n}{score ? ' · Score ' + H.heatScore(i) : ''}</option>)}</select>;
  if (t == 0) {
    hero = <div style={{ marginTop: 12 }}><small>CITY HEAT STATUS</small><div style={{ fontSize: 28, fontWeight: 700 }}>80 wards</div><small>{cnt[3] + cnt[4]} wards Very High/Extreme (sample of 16 shown)</small></div>;
    b = <><div className="grid3" style={{ marginBottom: 12 }}>{R.map((r, i) => <div key={i} className="tile" style={{ color: C[i], background: 'var(--card)', borderColor: C[i] }}><b>{[18, 24, 21, 12, 5][i]}</b><span className="sub">{r}</span></div>)}</div>
      <HeatCard />
      <div className="card"><h2>📋 Today’s Priority Actions</h2>{[[23, 4, 'Activate cooling center'], [41, 4, 'Issue public alert'], [18, 3, 'Medical preparedness']].map((p, i) => <div key={i} className="row al" style={{ borderLeft: '4px solid ' + C[p[1]], paddingLeft: 8 }}><div><span className="sub">Priority {i + 1}</span><br /><b>Ward {p[0]} · {R[p[1]]}</b><br /><span style={{ color: 'var(--acc)' }}>→ {p[2]}</span></div></div>)}</div>
      <div className="card"><h2>📈 Historical Analytics</h2>{[['2024', 12, 1450], ['2025', 18, 2100], ['2026', 27, 3020]].map(h => <div key={h[0]} className="row"><b>{h[0]}</b><div style={{ flex: 1 }}><div className="bar"><i style={{ width: h[1] / 27 * 100 + '%', background: C[3] }}></i></div><span className="sub">{h[1]} heatwave days · {h[2]} hospitalizations</span></div></div>)}</div></>;
  }
  if (t == 1) b = <><div className="card"><h2>🗺️ Live GIS Risk Map</h2><div className="chips">{['Thermal Stress', 'Elderly Density', 'Outdoor Workers', 'Population'].map((l, i) => <span key={i} className={'chip ' + (S.layer == i ? 'on' : '')} onClick={() => set({ layer: i })}>{l}</span>)}</div>
    <div className="mapw"><MapView /></div>{S.layer == 0 ? <Legend /> : <div className="leg">Darker blue = higher density</div>}</div>
    <div className="card"><h2>📅 City Forecast</h2><table><tbody><tr><th>Ward</th>{['Today', 'Tmrw', 'D3', 'D4', 'D5'].map(d => <th key={d}>{d}</th>)}</tr>{[11, 9, 7, 2].map(i => <tr key={i}><td><b>{W[i].n}</b></td>{H.fc(i).map((r, k) => <td key={k}>{E[r]}</td>)}</tr>)}</tbody></table></div></>;
  if (t == 2) b = <><div className="card"><h2>🌊 Heatwave Event · 5-Day Prediction</h2>{wardSel()}<HeatChart i={S.sel} adm={1} /></div>
    <div className="card"><h2>🤖 AI Mortality Risk Prediction · {w.n}</h2>
      <div className="row"><span>HTSI score</span><b>{H.hs(S.sel)[0]}/100</b></div><div className="row"><span>User alert</span><b>{AL[w.r]}</b></div><div className="row"><span>Thermal stress</span><Badge r={w.r} /></div>
      <div className="row"><span>Air quality (AQI)</span><AqBadge l={aqLv(w.aqi)} /> <b>{w.aqi}</b></div><div className="row"><span>Outdoor Safety Index</span><Badge r={H.osiLv(S.sel)} /></div>
      <div className="row"><span>Hospitalization risk</span><Badge r={Math.max(0, w.r - 1)} /></div>
      <div className="row"><span>Mortality risk</span><b style={{ color: 'var(--pri)' }}>{['Baseline', 'Baseline', 'Watch', 'Elevated', 'High'][w.r]}</b></div><div className="row"><span>Confidence</span><b>{80 + w.r * 2}%</b></div>
      <b className="sub">Contributing factors</b><ul style={{ margin: '4px 0', paddingLeft: 18 }}><li>High temperature ({w.t}°C)</li><li>Humidity {w.h}%</li><li>Elderly density {w.e}%</li><li>Air quality {AQL[aqLv(w.aqi)]} (AQI {w.aqi})</li><li>Historical heat-health impact</li></ul></div>
    <div className="card"><h2>🏥 Expected Hospitalizations</h2>{[['Today', 120, 1], ['Tomorrow', 160, 2], ['Day 3', 230, 3], ['Day 4', 280, 4]].map(h => <div key={h[0]} className="row"><span style={{ width: 70 }}>{h[0]}</span><div className="bar" style={{ flex: 1 }}><i style={{ width: h[1] / 300 * 100 + '%', background: C[h[2]] }}></i></div><b>{h[1]}</b></div>)}<p className="sub">Exact figures appear only when a validated model/data is connected.</p></div></>;
  if (t == 3) {
    const green5 = (f, label, color, plus) => <><div className="row"><span>{label}</span><b>{w[f]}%</b></div><div className="bar" style={{ marginBottom: 6 }}><i style={{ width: w[f] + '%', background: color }}></i></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: f == 'tree' ? 10 : 0 }}><button className="btn s a" onClick={() => green(S.sel, f, -5)}>−5</button><button className="btn s a" onClick={() => green(S.sel, f, 5)}>{plus}</button></div></>;
    b = <><SosCard />
      <div className="card"><h2>📢 Automated Trigger</h2><div style={{ background: '#b3261e18', borderRadius: 10, padding: 10 }}><b className="sub">IF Thermal Stress = Extreme AND Vulnerable Population = High</b><br />→ Emergency Heat Alert<br />→ Cooling Center Activation<br />→ Medical Preparedness<br />
        <button className="btn s" style={{ marginTop: 8 }} onClick={() => { set({ appr: true }); toast('Actions approved – alert & cooling center activation queued'); }}>{S.appr ? 'Approved ✓' : 'Approve Actions'}</button></div></div>
      <AlertForm />
      <div className="card"><h2>🧊 Cooling Centers</h2>{CC.map((c, i) => <div key={i} className="row"><div><b>{c.n}</b><br /><span className="sub">{c.occ}/{c.cap} · {c.occ >= c.cap ? 'Full' : 'Available'} · {W[c.ward].n}</span><br /><span className="sub">👤 {c.inc} · <a href={tel(c)} style={{ color: 'var(--acc)' }}>📞 {c.ph}</a></span></div><div><button className="btn s a" onClick={() => occ(i, -20)}>−20</button> <button className="btn s a" onClick={() => occ(i, 20)}>+20</button></div></div>)}</div>
      <div className="card"><h2>🏥 Hospital Preparedness</h2><p className="sub">Heatwave readiness snapshot for nearby hospitals. Bed figures below are prototype/demo availability and should be replaced by live hospital feeds for deployment.</p>{HF.map(h => <div key={h.n} className="card" style={{ marginBottom: 8 }}><div className="top"><b>{h.n}</b><span className="badge" style={{ color: h.avail > 0 ? '#2e7d32' : '#d32f2f', borderColor: h.avail > 0 ? '#2e7d32' : '#d32f2f' }}>{h.load}% load</span></div><div className="grid" style={{ marginTop: 8 }}><div className="tile"><b>{h.avail}/{h.bed}</b><span className="sub">Beds available</span></div><div className="tile"><b>{h.icuAvail}/{h.icu}</b><span className="sub">ICU available</span></div><div className="tile"><b>{h.erAvail}/{h.er}</b><span className="sub">Emergency slots</span></div><div className="tile"><b>{h.ventAvail}/{h.vent}</b><span className="sub">Ventilators</span></div></div><div className="bar" style={{ marginTop: 8 }}><i style={{ width: h.load + '%', background: h.load >= 80 ? C[3] : C[2] }}></i></div><div className="row"><span>Available beds</span><b>{h.avail} / {h.bed}</b></div><div className="row"><span>ICU</span><b>{h.icuAvail} / {h.icu} available</b></div><div className="row"><span>Emergency</span><b>{h.erAvail} / {h.er} available</b></div><div className="row"><span>Ventilators</span><b>{h.ventAvail} / {h.vent} available</b></div><div className="sub" style={{ marginTop: 6 }}>📞 {h.ph} · Demo availability</div></div>)}</div>
      <div className="card"><h2>👷 Outdoor Work &amp; ⚡ Infrastructure</h2><Ul><li>Adjust outdoor work hours in Extreme wards</li><li>Increase hydration/rest breaks; issue worker alert</li><li>Ensure water tanker availability</li><li>Healthcare staff on standby</li><li>Coordinate power-demand preparedness</li></Ul></div>
      <div className="card"><h2>🌳 Long-Term Mitigation Investment</h2><p className="sub">Simulate greening/cool-roof investment for a ward and watch its Community Heat Score climb.</p>{wardSel(true)}
        {green5("tree", "🌳 Tree cover", "#2e7d32", "+5 Plant trees")}{green5("roof", "🏠 Cool-roof adoption", "#1565c0", "+5 Cool-roof subsidy")}
        <div className="row" style={{ marginTop: 10, border: 0 }}><span>Community Heat Score</span><b style={{ color: scoreTier(H.heatScore(S.sel)), fontSize: 20 }}>{H.heatScore(S.sel)}/100</b></div></div>
      <LeaderboardCard /></>;
  }
  if (t == 4) b = <><h2>📘 Heatstroke Protection Guide</h2><Guide /><Bot /></>;
  return <Shell title={['City Overview', 'GIS Risk Map', 'AI Predictions', 'Response Management', 'Protection Guide'][t]} sub={'Municipal dashboard' + (S.name ? ' · ' + S.name : '')}
    tabs={[['🏛️', 'Overview'], ['🗺️', 'Map'], ['🤖', 'Predict'], ['🛠️', 'Manage'], ['📘', 'Guide']]} hero={hero} h1="#1565c0" h2="#0d3e7a">{b}</Shell>;
}

/* ---------- App (state + actions) ---------- */
export default function App() {
  const [S, setS] = useState({ lr: 'c', hm: 'htsi', hd: 0, chat: [], lang: 'en', loc: null, role: null, tab: 0, sel: 7, layer: 0, facil: true, age: 'Adult', job: 'Indoor', why: false, alerts: [{ w: 19, r: 4, aud: 'Residents', ch: 'SMS, WhatsApp, App' }], appr: false, name: '', stOpen: false, ecName: '', ecPhone: '', cond: '', phone: '', profileOpen: false, sos: [], bo: false, rd: null, rdn: '', rdi: '', rq: '', rt: null, wx: null });
  const [W, setW] = useState(makeWards), [CC, setCC] = useState(makeCC), [YOU, setYOU] = useState(7), [modal, setModal] = useState(null), [ts, setTs] = useState({ m: '', on: false });
  const set = useCallback(p => setS(s => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);
  const H = useMemo(() => mk(W), [W]);
  const live = useRef({}); live.current = { S, W, CC, YOU, H };
  const tm = useRef();
  const toast = useCallback(m => { setTs({ m, on: true }); clearTimeout(tm.current); tm.current = setTimeout(() => setTs(t => ({ ...t, on: false })), 1800); }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [S.tab, S.role, S.profileOpen]);

  const goTab = i => set({ tab: i, bo: false });
  const logout = () => set({ role: null, chat: [], bo: false });
  const personal = () => { let r = W[YOU].r; if (S.age !== 'Adult') r++; if (S.job === 'Outdoor') r++; return Math.min(4, r); };
  const openWard = (i, d = 0) => setModal({ type: 'ward', i, d });
  const green = (i, f, d) => { const w = live.current.W[i]; setW(ws => ws.map((x, k) => k == i ? { ...x, [f]: Math.max(0, Math.min(100, x[f] + d)) } : x)); toast((d > 0 ? 'Invested in ' : 'Cut back ') + (f == 'tree' ? 'tree cover' : 'cool-roof adoption') + ' · ' + w.n); };
  const occ = (i, d) => setCC(cs => cs.map((c, k) => k == i ? { ...c, occ: Math.max(0, Math.min(c.cap, c.occ + d)) } : c));

  const wx = (la, ln) => { if (!CFG.OPENWEATHER_KEY) return; fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${la}&lon=${ln}&units=metric&appid=${CFG.OPENWEATHER_KEY}`).then(r => r.json()).then(d => { if (d.main) set({ wx: { t: Math.round(d.main.temp), h: d.main.humidity, w: Math.round(d.wind.speed * 3.6) } }); else toast('Weather API: ' + (d.message || 'error')); }).catch(() => toast('Weather fetch failed')); };
  const locate = () => {
    if (!navigator.geolocation) { toast('Location is not supported here'); return; } toast('Fetching your location…');
    navigator.geolocation.getCurrentPosition(p => { const la = p.coords.latitude, ln = p.coords.longitude, { b, d } = nearestWard(la, ln); wx(la, ln); set({ loc: { la, ln, ac: p.coords.accuracy, km: Math.sqrt(d) * 111 }, sel: b }); setYOU(b); toast('You are in ' + live.current.W[b].n); }, () => toast('Location blocked. Allow location access in your browser.'), { enableHighAccuracy: true, timeout: 10000 });
  };
  const doLogin = (u, p) => { const ad = live.current.S.lr == 'a'; set({ role: ad ? 'a' : 'c', name: u, ...(ad ? {} : { phone: p }), tab: 0, sel: ad ? 11 : live.current.YOU }); if (!ad) locate(); };
  const sos = () => {
    const build = (loc, you) => {
      const { S, W } = live.current, now = new Date(), gps = !!loc, p = loc ? [loc.la, loc.ln] : WP(you), g = p[0].toFixed(5) + ',' + p[1].toFixed(5), mapLink = 'https://www.google.com/maps?q=' + g;
      set(s => ({ sos: [{ name: S.name || 'Citizen', age: S.age, cond: S.cond || '', loc: (gps ? 'GPS · ' : 'Approx · ') + g + ' · ' + W[you].n, time: now.toLocaleString() }, ...s.sos] }));
      const msg = encodeURIComponent(`🚨 HEAT EMERGENCY – I need help.\nName: ${S.name || 'Not set'}\nAge group: ${S.age}${S.cond ? `\nConditions: ${S.cond}` : ''}\nLocation: ${mapLink}\nTime: ${now.toLocaleString()}`);
      const wa = S.ecPhone && S.ecPhone.length == 10 ? `https://wa.me/91${S.ecPhone}?text=${msg}` : null;
      if (wa) { window.open(wa, '_blank', 'noopener'); toast('🆘 Location sent · Alerting ' + (S.ecName || 'your emergency contact') + ' on WhatsApp'); } else toast('🆘 Emergency signal sent to city control room');
      setModal({ type: 'sos', gps, wa, mapLink });
    };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => { const la = pos.coords.latitude, ln = pos.coords.longitude, { b, d } = nearestWard(la, ln); wx(la, ln); const loc = { la, ln, ac: pos.coords.accuracy, km: Math.sqrt(d) * 111 }; set({ loc, sel: b }); setYOU(b); build(loc, b); }, () => build(live.current.S.loc, live.current.YOU), { enableHighAccuracy: true, timeout: 6000 });
    else build(live.current.S.loc, live.current.YOU);
  };

  const findRoute = async d => {
    const { S, CC, H, YOU } = live.current, o = RO(S.loc, YOU); if (!d) return; set({ rt: { busy: 1 } });
    try { set({ rt: await computeRoutes(o, d, H, CC) }); } catch (e) { set({ rt: { err: 'Could not fetch routes. Check your internet connection or try another destination.' } }); }
  };
  const rsearch = async () => {
    const q = (live.current.S.rq || '').trim(); set({ rq: q }); if (!q) return; toast('Searching…');
    try { const r = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&viewbox=76.8,28.9,77.6,28.4&q=' + encodeURIComponent(q))).json(); if (!r[0]) { toast('Place not found'); return; }
      const d = [+r[0].lat, +r[0].lon]; set({ rd: d, rdn: r[0].display_name.split(',').slice(0, 2).join(','), rdi: '' }); findRoute(d); } catch (e) { toast('Search failed – check internet'); }
  };
  const symRoute = target => { set({ rd: target.ll, rdn: target.n, rdi: '', tab: 6, bo: false }); findRoute(target.ll); };
  const ask = q => {
    q = q.trim(); if (!q) return;
    set(s => ({ chat: [...(s.chat.length ? s.chat : [{ f: 'b', t: greet(s.role) }]), { f: 'u', t: q }] }));
    setTimeout(() => { const { S, YOU, CC } = live.current; set(s => ({ chat: [...s.chat, { f: 'b', t: reply(q, S.role, RO(S.loc, YOU), CC, KB) }] })); }, 350);
  };

  const ctx = { S, set, W, CC, YOU, H, modal, setModal, toast, goTab, logout, personal, openWard, green, occ, locate, doLogin, sos, findRoute, rsearch, symRoute, ask };
  return <Ctx.Provider value={ctx}>
    <div id="app">{!S.role ? <Login /> : S.role == 'a' ? <Admin /> : <Citizen />}</div>
    <div id="toast" className={ts.on ? 'on' : ''}>{ts.m}</div>
    <Modal />
  </Ctx.Provider>;
}
