'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// engine.setShape(n)      -> jump target (used by the preloader)
// engine.morph(a, b, t)   -> scroll-driven blend between two shapes, t in 0..1
export const engine = { setShape() {}, morph() {}, ready: null, vp: 0  };

const N = typeof window !== 'undefined' && window.innerWidth < 800 ? 24000 : 48000, TAU = 6.2832, R = Math.random, g = () => (R() + R() + R() - 1.5) / 1.5, r = (a, b) => a + R() * (b - a);
const RV = new Float32Array(N * 3).map(() => g()); // per-particle random vector (curved flight paths + thickness)
const DL = new Float32Array(N).map(() => R());      // per-particle delay (staggered morph)
const WHITE = new Float32Array(N * 3).fill(1);
const TILT_X = 0.03, TILT_Y = 0.05; // max tilt in radians (was 0.09 / 0.14)
const REP = { globe: 1, india: 1 };                 // only these shapes repel the mouse
const WEBFLOW = 'm24 4.515-7.658 14.97H9.149l3.205-6.204h-.144C9.566 16.713 5.621 18.973 0 19.485v-6.118s3.596-.213 5.71-2.435H0V4.515h6.417v5.278l.144-.001 2.622-5.277h4.854v5.244h.144l2.72-5.244H24Z';
const INDIA = [[74.5,37],[77,35.5],[79,34],[78.5,32.5],[79,30.5],[81,30],[80,28.5],[84,27.5],[88,27],[88.8,27.5],[89.5,26.8],[92,27],[95,28],[97,28],[95.5,26],[94,24],[93,22.5],[92,21],[91.5,24.5],[90,25.2],[89,26],[88.5,24],[89,22],[87,21.5],[86.5,20],[84.5,19],[82.5,17],[80.2,15.5],[80.2,13],[79.8,10.5],[78.5,9],[77.5,8],[76.5,9.5],[75.5,12],[74.5,14.5],[73.5,17],[72.8,19.5],[72.5,21.5],[70.5,21],[69,22.5],[70,24],[71.5,24.5],[70,26],[71,27.8],[73.5,29.5],[74.5,31],[74,32.8],[74.5,34.5]];
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

const fill = (fn) => { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const p = fn(i); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2] || 0; } return a; };
// Animated shape: upd(array, time) rewrites the target every frame
const dyn = (upd) => { const a = new Float32Array(N * 3); a.upd = (t) => upd(a, t); upd(a, 0); return a; };
const raster = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); draw(x); return x.getImageData(0, 0, w, h).data; };
const mask = (d, w, h, wt, map) => {
  const L = []; for (let i = 0; i < w * h; i++) { const q = wt(d, i * 4); if (q > 0.08) L.push(i, q); }
  return fill(() => { for (;;) { const k = ((R() * L.length) / 2 | 0) * 2; if (R() < L[k + 1]) { const i = L[k]; return map(((i % w) + R()) / w, (((i / w) | 0) + R()) / h); } } });
};

// ---------- Naruto / Sasuke actors, built from transparent PNGs ----------
const BODY_COLOR = false; // true = particles use the artwork's own colours (lightened) instead of white
const NB = 7;             // number of Chidori bolts

function actor(img, cfg, M) {
  const w = img.width, h = img.height, d = raster(w, h, (x) => x.drawImage(img, 0, 0));
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bcx = (x0 + x1) / 2, bcy = (y0 + y1) / 2, bw = x1 - x0, bh = y1 - y0;
  const inStrip = (x, y) => cfg.strip && x >= cfg.strip[0] && x <= cfg.strip[2] && y >= cfg.strip[1] && y <= cfg.strip[3];
  const wb = new Float64Array(w * h), we = new Float64Array(w * h); // sampling weights: body / energy pixels
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4, al = d[p + 3] / 255;
    if (al < 0.16) continue;
    const cr = d[p], cg = d[p + 1], cb = d[p + 2], lm = (cr + cg + cb) / 3, sat = Math.max(cr, cg, cb) - Math.min(cr, cg, cb);
    if (cfg.energy && cfg.energy(lm, sat, x, y)) { we[i] = al; continue; }
    if (cfg.ras && (x - cfg.ras[0]) ** 2 + (y - cfg.ras[1]) ** 2 < (cfg.ras[2] * 1.1) ** 2) continue; // the Rasengan ball is drawn procedurally
    wb[i] = al * (0.3 + 0.7 * (1 - lm / 255)) * (inStrip(x, y) ? 3 : 1);
  }
  const picker = (wts) => { const c = new Float64Array(wts.length); let s = 0; for (let i = 0; i < wts.length; i++) { s += wts[i]; c[i] = s; } return () => { let lo = 0, hi = c.length - 1; const v = R() * s; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < v) lo = m + 1; else hi = m; } return lo; }; };
  const pb = picker(wb), pe = cfg.energy ? picker(we) : null;
  const rc = cfg.ras ? [cfg.ras[0] - bcx, -(cfg.ras[1] - bcy)] : null, oc = cfg.origin ? [cfg.origin[0] - bcx, -(cfg.origin[1] - bcy)] : null;
  const LX = new Float32Array(M), LY = new Float32Array(M), LZ = new Float32Array(M), K = new Uint8Array(M);
  const P1 = new Float32Array(M), P2 = new Float32Array(M), P3 = new Float32Array(M), BC = new Float32Array(M * 3).fill(1);
  const nR = cfg.ras ? Math.round(M * 0.12) : 0, nB = cfg.origin ? Math.round(M * 0.08) : 0, nC = cfg.origin ? Math.round(M * 0.02) : 0, nE = cfg.energy ? Math.round(M * 0.2) : 0;
  for (let k = 0; k < M; k++) {
    const j = k * 3;
    P1[k] = R() * TAU; P2[k] = R() * TAU; P3[k] = R() * TAU;
    if (k < nR) { // Rasengan: P1 = polar angle, P2 = spin phase, P3 = radius
      K[k] = 2; const ty = k % 10, q = ty < 6 ? Math.pow(R(), 0.45) * 0.95 : ty < 9 ? 1 + R() * 0.75 : 1.2 + g() * 0.06;
      P1[k] = Math.acos(2 * R() - 1); P3[k] = q;
      BC[j] = q < 0.5 ? 0.85 : q < 1 ? 0.2 : 0.55; BC[j + 1] = q < 0.5 ? 1 : q < 1 ? 0.85 : 0.9; BC[j + 2] = 1;
    } else if (k < nR + nB) { K[k] = 4; P1[k] = R(); P2[k] = k % NB; }   // Chidori bolt: P1 = position along bolt, P2 = bolt id
    else if (k < nR + nB + nC) K[k] = 5;                                  // Chidori core
    else {
      const en = k < nR + nB + nC + nE, i = (en ? pe : pb)(), x = (i % w) + R(), y = ((i / w) | 0) + R(), p = i * 4;
      LX[k] = x - bcx; LY[k] = -(y - bcy); LZ[k] = g() * 6;
      if (en) { K[k] = 3; P1[k] = Math.hypot(x - cfg.origin[0], y - cfg.origin[1]); BC[j] = 0.3; BC[j + 1] = 0.6; BC[j + 2] = 1; }
      else {
        const cr = d[p], cg = d[p + 1], cb = d[p + 2];
        if (inStrip(x, y)) { K[k] = 1; P3[k] = Math.min(1, Math.max(0, (cfg.strip[2] - x) / (cfg.strip[2] - cfg.strip[0]))); } // wind weight: 0 at the head, 1 at the tips
        if (BODY_COLOR) { BC[j] = 0.3 + 0.7 * cr / 255; BC[j + 1] = 0.3 + 0.7 * cg / 255; BC[j + 2] = 0.3 + 0.7 * cb / 255; }
        else if (cb > cr + 45 && cg > cr + 25 && (cr + cg + cb) / 3 > 130) { BC[j] = 0.35; BC[j + 1] = 0.85; BC[j + 2] = 1; }
      }
    }
  }
  const bolts = new Float32Array(NB * 66), act = new Uint8Array(NB);
  const regen = () => { // new jagged lightning bolts (midpoint displacement)
    for (let b = 0; b < NB; b++) {
      const ang = -2.2 + (2.6 * (b + R() * 0.7)) / NB, L = 100 + R() * 210, dx = Math.cos(ang), dy = -Math.sin(ang), o = b * 66;
      bolts[o] = oc[0]; bolts[o + 1] = oc[1]; bolts[o + 64] = oc[0] + dx * L; bolts[o + 65] = oc[1] + dy * L;
      for (let st = 16; st >= 1; st >>= 1) for (let i = st; i < 32; i += st * 2) {
        const a = o + (i - st) * 2, c = o + (i + st) * 2, m = o + i * 2, off = (R() - 0.5) * L * 0.3 * (st / 16);
        bolts[m] = (bolts[a] + bolts[c]) / 2 - dy * off; bolts[m + 1] = (bolts[a + 1] + bolts[c + 1]) / 2 + dx * off;
      }
      act[b] = R() < 0.8 ? 1 : 0;
    }
  };
  const outP = new Float32Array(M * 3), outC = new Float32Array(M * 3);
  let lastT = -1, lastB = -1;
  const upd = (t) => { // local coordinates (image pixels, y up); runs once per frame
    if (t === lastT) return; lastT = t;
    if (oc) { const bt = Math.floor(t * 14); if (bt !== lastB) { lastB = bt; regen(); } }
    for (let k = 0; k < M; k++) {
      const j = k * 3, kd = K[k]; let x = LX[k], y = LY[k], z = LZ[k], cr = BC[j], cg = BC[j + 1], cb = BC[j + 2];
      if (kd === 1) { // headband strips: wind blowing right -> left
        const wv = P3[k], ph = 0.09 * x + 7 * t;
        y += wv * 7 * Math.sin(ph); x -= wv * 3 * (0.5 + 0.5 * Math.sin(ph));
      } else if (kd === 2) { // Rasengan: spinning ball + swirl arms + ring
        const rho = P3[k], ty = k % 10, arm = ty > 5 && ty < 9, ring = ty === 9;
        const th = ring ? 1.5708 : P1[k], ph = P2[k] + (t * 5.5) / (0.5 + rho) + (arm ? rho * 3.2 : 0), sn = Math.sin(th);
        const ax = rho * sn * Math.cos(ph), ay = rho * Math.cos(th) * (arm ? 0.35 : 1), az = rho * sn * Math.sin(ph);
        let x1 = ax * 0.878 - ay * 0.479, y1 = ax * 0.479 + ay * 0.878, z1 = az;
        if (ring) { const yy = y1 * 0.454 - z1 * 0.891; z1 = y1 * 0.891 + z1 * 0.454; y1 = yy; }
        const sc = cfg.ras[2] * (1 + 0.05 * Math.sin(t * 11));
        x = rc[0] + sc * x1; y = rc[1] + sc * y1; z = sc * z1;
      } else if (kd === 3) { // Chidori ribbons: crackling jitter + travelling light pulses
        const dist = P1[k], fl = Math.sin(t * 23 + P2[k] * 9) > 0.93 ? 3 : 1, A = (1 + 6 * Math.min(dist / 260, 1)) * fl;
        x += A * Math.sin(t * 43 + P2[k]); y += A * Math.sin(t * 37 + P3[k]); z += A * Math.sin(t * 29 + P2[k] + P3[k]);
        const p = 0.5 + 0.5 * Math.sin(dist * 0.05 - t * 9 + P3[k] * 0.4), q = Math.min(1, p * p * (fl > 1 ? 1.5 : 1));
        cr = 0.3 + 0.7 * q; cg = 0.6 + 0.4 * q; cb = 1;
      } else if (kd === 4) { // Chidori bolts (flicker on/off every ~70ms)
        const b = P2[k] | 0;
        if (act[b]) { const f = P1[k] * 32, i0 = Math.min(31, f | 0), fr = f - i0, o = (b * 33 + i0) * 2, jt = (P3[k] - 3.14) * 0.35; x = bolts[o] + (bolts[o + 2] - bolts[o]) * fr + jt; y = bolts[o + 1] + (bolts[o + 3] - bolts[o + 1]) * fr + jt; z = jt; }
        else { x = oc[0] + Math.sin(P1[k] * 40 + t * 30) * 6; y = oc[1] + Math.cos(P1[k] * 55 + t * 26) * 6; z = 0; }
        cr = 0.7; cg = 0.88; cb = 1;
      } else if (kd === 5) { // Chidori core glow
        const a = P1[k] + t * 9, b = P2[k] - t * 7, rr = 14 * (0.5 + 0.5 * Math.abs(Math.sin(P3[k]))) * (1 + 0.15 * Math.sin(t * 25));
        x = oc[0] + rr * Math.cos(a) * Math.sin(b); y = oc[1] + rr * Math.cos(b); z = rr * Math.sin(a) * Math.sin(b);
        cr = 0.9; cg = 0.97; cb = 1;
      }
      outP[j] = x; outP[j + 1] = y; outP[j + 2] = z; outC[j] = cr; outC[j + 1] = cg; outC[j + 2] = cb;
    }
  };
  return { bw, bh, upd, pos: outP, col: outC };
}

function build(W, H, img, logo, nImg, sImg) {
  const m = Math.min(W, H), S = {};
  const nar = W < 800; // tablet portrait / mobile layout
  S.dust = fill(() => [r(-W, W) * 0.5, r(-H, H) * 0.5, r(-200, 200)]);
  S.cluster = fill(() => [g() * 70, g() * 70, g() * 40]);
  S.ring = fill(() => { const a = (Math.floor(R() * 28) + R() * 0.55) * TAU / 28, rr = 34 + g() * 2; return [Math.cos(a) * rr, Math.sin(a) * rr, 0]; });

  // Portrait sampled from the photo
  const pw0 = 190, ph0 = Math.round(190 * img.height / img.width);
  const pd = raster(pw0, ph0, (x) => x.drawImage(img, 0, 0, pw0, ph0));
  const lum = (d, i) => d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1;
// Background = light, low-saturation pixels connected to the image border
const isBg = new Uint8Array(pw0 * ph0), st = [];
const seed = (k) => { if (isBg[k]) return; const p = k * 4, a = pd[p], b = pd[p + 1], c = pd[p + 2]; if (lum(pd, p) > 110 && Math.max(a, b, c) - Math.min(a, b, c) < 34) { isBg[k] = 1; st.push(k); } };
for (let x = 0; x < pw0; x++) seed(x);
for (let y = 0; y < ph0; y++) { seed(y * pw0); seed(y * pw0 + pw0 - 1); }
while (st.length) { const k = st.pop(), x = k % pw0; if (x > 0) seed(k - 1); if (x < pw0 - 1) seed(k + 1); if (k >= pw0) seed(k - pw0); if (k < pw0 * (ph0 - 1)) seed(k + pw0); }
const ph = Math.min(H, W * 1.15 * img.height / img.width), pw = ph * img.width / img.height;
S.portrait = mask(pd, pw0, ph0, (d, i) => (isBg[i >> 2] ? 0 : 0.72 + 0.28 * (1 - lum(d, i) / 255)), (u, v) => [(u - 0.5) * pw, -H / 2 + (1 - v) * ph, g() * 6]);

  // Two dense swirling dust clouds (slowly rotating)
  const C = [[W * 0.2, H * 0.18, W * 0.17, H * 0.1, -0.25], [0, -H * 0.2, W * 0.2, H * 0.11, 0.12]]; // cx, cy, rx, ry, tilt
  const cd = new Float32Array(N).map(() => Math.pow(Math.abs(g()), 1.15)), ca = new Float32Array(N).map(() => R() * TAU), cz = new Float32Array(N).map(() => g() * 90);
  S.cloud = dyn((a, t) => { for (let i = 0; i < N; i++) { const c = C[i & 1], an = ca[i] + (t * 0.12) / (0.25 + cd[i]), x = Math.cos(an) * cd[i] * c[2], y = Math.sin(an) * cd[i] * c[3], co = Math.cos(c[4]), si = Math.sin(c[4]); a[i * 3] = c[0] + x * co - y * si; a[i * 3 + 1] = c[1] + x * si + y * co; a[i * 3 + 2] = cz[i]; } });

  const Rg = m * 0.36;
  S.globe = fill(() => { const u = r(-1, 1), a = R() * TAU, s = Math.sqrt(1 - u * u); return [Rg * s * Math.cos(a), Rg * u, Rg * s * Math.sin(a)]; });
  const sc = (m * 0.8) / 29;
  S.india = fill(() => { for (;;) { const lo = r(68, 98), la = r(8, 37); if (inPoly(lo, la, INDIA)) return [(lo - 82.5) * sc, (la - 22) * sc, g() * 8]; } });

  // const lw = Math.min(W * 0.42, 640), lh = lw / 2;
  const lw = nar ? W * 0.86 : Math.min(W * 0.42, 640), lh = lw / 2, lox = nar ? 0 : W * 0.2, loy = nar ? -H * 0.14 : 0;
  const ld = raster(400, 200, (x) => {
    x.fillStyle = x.strokeStyle = '#fff'; x.save(); x.translate(12, 16); x.scale(7, 7); x.fill(new Path2D(WEBFLOW)); x.restore();
    x.lineWidth = 14; x.beginPath(); x.arc(300, 100, 78, 0, TAU); x.stroke();
    x.font = 'bold 118px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('W', 300, 104);
  });
  S.logos = mask(ld, 400, 200, (d, i) => (d[i + 3] > 128 ? 1 : 0), (u, v) => [(u - 0.5) * lw + lox, (0.5 - v) * lh + loy, g() * 6]);

  // Automation: Outlook ──(AI)──> Zoho, with particles flowing along the connection
const aw = nar ? W * 0.92 : Math.min(W * 0.5, 760), sk = aw / 900, ox = nar ? 0 : -W * 0.2, oy = nar ? -H * 0.14 : 0;
const ad = raster(900, 300, (x) => {
  x.strokeStyle = x.fillStyle = '#fff'; x.lineJoin = 'round'; x.lineWidth = 12;
  x.beginPath(); x.roundRect(70, 70, 190, 150, 14); x.stroke();                                   // Outlook envelope
  x.beginPath(); x.moveTo(78, 82); x.lineTo(165, 160); x.lineTo(252, 82); x.stroke();
  x.beginPath(); x.roundRect(10, 105, 110, 110, 14); x.fill();                                    // "O" badge
  x.globalCompositeOperation = 'destination-out'; x.lineWidth = 14; x.beginPath(); x.arc(65, 160, 24, 0, TAU); x.stroke(); x.globalCompositeOperation = 'source-over';
  x.lineWidth = 8; x.beginPath(); x.arc(450, 150, 40, 0, TAU); x.stroke();                        // AI node
  x.font = 'bold 34px Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AI', 450, 153);
  x.lineWidth = 7; 'ZOHO'.split('').forEach((c, k) => { x.beginPath(); x.roundRect(640 + k * 66, 122, 56, 56, 9); x.stroke(); x.font = 'italic bold 36px Arial,sans-serif'; x.fillText(c, 668 + k * 66, 152); }); // Zoho tiles
});
const AM = mask(ad, 900, 300, (d, i) => (d[i + 3] > 128 ? 1 : 0), (u, v) => [(u * 900 - 450) * sk + ox, (150 - v * 300) * sk + oy, g() * 5]);
const LU = new Float32Array(N).map(() => R());
S.automation = dyn((a, t) => {
  for (let i = 0; i < N; i++) {
    const j = i * 3;
    if (i % 10 < 7) { if (!a.init) { a[j] = AM[j]; a[j + 1] = AM[j + 1]; a[j + 2] = AM[j + 2]; } }
    else { const u = (LU[i] + t * 0.12) % 1; a[j] = (270 + u * 370 - 450) * sk + ox; a[j + 1] = RV[j + 1] * 2.5 + oy; a[j + 2] = RV[j + 2] * 3; } // dots travel Outlook -> Zoho
  }
  a.init = 1;
});

  // DNA: two strands + base-pair rungs on a tilted axis, rotating around that axis forever
  const th = 0.38, ax = [Math.cos(th), Math.sin(th)], pp = [-ax[1], ax[0]], L = Math.hypot(W, H) * 0.62, A = H * 0.13;
  const hd = new Float32Array(N), hp = new Float32Array(N), hm = new Float32Array(N), hr = new Uint8Array(N);
  for (let i = 0; i < N; i++) { const k = i % 8, rung = k > 5; hr[i] = rung; hd[i] = rung ? Math.round(r(-L, L) / 30) * 30 : r(-L, L); hp[i] = rung ? 0 : (k & 1) * Math.PI; hm[i] = rung ? r(-1, 1) : 1; }
  S.helix = dyn((a, t) => { for (let i = 0; i < N; i++) { const j = i * 3, ph = hd[i] * 0.0055 + hp[i] - t * 0.8, yy = A * Math.sin(ph) * hm[i], th2 = hr[i] ? 1.2 : 2.6; a[j] = ax[0] * hd[i] + pp[0] * yy + RV[j] * th2; a[j + 1] = ax[1] * hd[i] + pp[1] * yy + RV[j + 1] * th2; a[j + 2] = A * Math.cos(ph) * hm[i] + RV[j + 2] * th2; } });

  S.wave = fill(() => { const x = r(-0.6, 0.6) * W; return [x, Math.sin(x * 0.006) * H * 0.18 + x * 0.2 + g() * 3, g() * 30]; });

  // Spiral galaxy, rigid slow rotation
  const sr = new Float32Array(N).map(() => 30 + Math.pow(R(), 0.7) * m * 0.45), sa = new Float32Array(N).map((_, i) => sr[i] * 0.014 + Math.floor(R() * 3) * 2.094 + g() * 0.3), sz = new Float32Array(N).map(() => g() * 20);
  S.spiral = dyn((a, t) => { for (let i = 0; i < N; i++) { const an = sa[i] + t * 0.25; a[i * 3] = Math.cos(an) * sr[i]; a[i * 3 + 1] = Math.sin(an) * sr[i]; a[i * 3 + 2] = sz[i]; } });

  const bw = Math.min(900, W * (nar ? 0.86 : 0.7)), bh = 240, t = 22;
  S.frame = fill(() => { for (;;) { const x = r(-bw / 2 - t, bw / 2 + t), y = r(-bh / 2 - t, bh / 2 + t); if (Math.abs(x) > bw / 2 || Math.abs(y) > bh / 2) return [x, y, g() * 4]; } });

  const qd = raster(300, 300, (x) => { x.fillStyle = '#fff'; x.font = 'bold 380px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText('“', 150, 330); });
// const qs = Math.min(W * 0.3, H * 0.6) / 300;
// S.quote = mask(qd, 300, 300, (d, i) => (d[i + 3] > 128 ? 1 : 0), (u, v) => [(u - 0.5) * 300 * qs - W * 0.22, (0.36 - v) * 300 * qs, g() * 6]);

const qs = (nar ? W * 0.5 : Math.min(W * 0.3, H * 0.6)) / 300;
S.quote = mask(qd, 300, 300, (d, i) => (d[i + 3] > 128 ? 1 : 0), (u, v) => [(u - 0.5) * 300 * qs - (nar ? 0 : W * 0.22), (0.36 - v) * 300 * qs - (nar ? H * 0.12 : 0), g() * 6]);


// Brand logo (V with wings) from public/logo-mark.png
const LW = nar ? W * 0.62 : Math.min(W * 0.34, 520), lgw = 380, lgh = Math.round(380 * logo.height / logo.width);
engine.logoH = LW * lgh / lgw; // used to place the % under the logo
const lgd = raster(lgw, lgh, (x) => x.drawImage(logo, 0, 0, lgw, lgh));
S.logo = mask(lgd, lgw, lgh, (d, i) => (d[i + 3] > 100 ? 1 : 0), (u, v) => [(u - 0.5) * LW, (0.5 - v) * LW * lgh / lgw, g() * 5]);


// ---- Naruto / Sasuke scenes: even particles = Naruto, odd = Sasuke; whoever is not on stage waits off-screen ----
const M = N >> 1;
const NA = actor(nImg, { ras: [275, 174, 42], strip: [340, 60, 452, 102] }, M);
const SA = actor(sImg, { origin: [218, 106], energy: (lm, sat, x, y) => lm > 198 && sat < 38 && y < 300 }, M);
const fit = (c, wf, hf) => Math.min((W * wf) / c.bw, (H * hf) / c.bh);
const waitN = new Float32Array(M * 3), waitS = new Float32Array(M * 3);
for (let k = 0; k < M; k++) { const j = k * 3, y = g() * H * 0.3, z = g() * 100; waitN[j] = -(W * 0.8 + R() * W * 0.4); waitN[j + 1] = y; waitN[j + 2] = z; waitS[j] = W * 0.8 + R() * W * 0.4; waitS[j + 1] = y; waitS[j + 2] = z; }
// const scene = (nSp, sSp) => { // spec = [scale, x, y] or null (waiting off-screen)

//   const a = new Float32Array(N * 3); a.col = new Float32Array(N * 3);
//   a.upd = (t) => {
//     NA.upd(t); SA.upd(t);
//     for (let k = 0; k < M; k++) {
//       const q = k * 3;
//       for (let c = 0; c < 2; c++) {
//         const ch = c ? SA : NA, sp = c ? sSp : nSp, j = (2 * k + c) * 3;
//         if (sp) { a[j] = ch.pos[q] * sp[0] + sp[1]; a[j + 1] = ch.pos[q + 1] * sp[0] + sp[2]; a[j + 2] = ch.pos[q + 2] * sp[0]; a.col[j] = ch.col[q]; a.col[j + 1] = ch.col[q + 1]; a.col[j + 2] = ch.col[q + 2]; }
//         else { const wt = c ? waitS : waitN; a[j] = wt[q]; a[j + 1] = wt[q + 1]; a[j + 2] = wt[q + 2]; a.col[j] = a.col[j + 1] = a.col[j + 2] = 1; }
//       }
//     }
//   };
//   a.upd(0); return a;
// };

const scene = (nSp, sSp) => { // spec = [scale, x, y, z], a function returning one each frame, or null (waiting off-screen)
  const a = new Float32Array(N * 3); a.col = new Float32Array(N * 3);
  a.upd = (t) => {
    NA.upd(t); SA.upd(t);
    const spec = [typeof nSp === 'function' ? nSp(t) : nSp, typeof sSp === 'function' ? sSp(t) : sSp];
    for (let k = 0; k < M; k++) {
      const q = k * 3;
      for (let c = 0; c < 2; c++) {
        const ch = c ? SA : NA, sp = spec[c], j = (2 * k + c) * 3;
        if (sp) { a[j] = ch.pos[q] * sp[0] + sp[1]; a[j + 1] = ch.pos[q + 1] * sp[0] + sp[2]; a[j + 2] = ch.pos[q + 2] * sp[0] + (sp[3] || 0); a.col[j] = ch.col[q]; a.col[j + 1] = ch.col[q + 1]; a.col[j + 2] = ch.col[q + 2]; }
        else { const wt = c ? waitS : waitN; a[j] = wt[q]; a[j + 1] = wt[q + 1]; a[j + 2] = wt[q + 2]; a.col[j] = a.col[j + 1] = a.col[j + 2] = 1; }
      }
    }
  };
  a.upd(0); return a;
};

const ay = nar ? -H * 0.2 : 0;
S.naruto = scene([nar ? fit(NA, 0.94, 0.36) : fit(NA, 0.5, 0.66), nar ? 0 : -W * 0.22, ay], null);
S.sasuke = scene(null, [nar ? fit(SA, 0.94, 0.36) : fit(SA, 0.34, 0.7), nar ? 0 : W * 0.22, ay]);
// const vx = nar ? 0.25 : 0.18, vy = nar ? -H * 0.08 : 0, vw = nar ? 0.46 : 0.33, vh = nar ? 0.28 : 0.5;
// S.versus = scene([fit(NA, vw, vh), -W * vx, vy], [fit(SA, vw * 0.9, vh), W * vx, vy]);
const vy = nar ? -H * 0.08 : 0, vw = nar ? 0.46 : 0.33, vh = nar ? 0.28 : 0.5;
const vN = fit(NA, vw, vh), vS = fit(SA, vw * 0.9, vh);
const endN = -NA.bw * vN * 0.46, endS = SA.bw * vS * 0.46;                          // they meet nose to nose at the centre
const fromN = -(W * 0.65 + NA.bw * vN * 0.5), fromS = W * 0.65 + SA.bw * vS * 0.5;  // far away, off-screen
const fly = (s, from, to, f) => (t) => {
  const v = engine.vp, p = Math.pow(v, 1.8), sh = v > 0.88 ? (v - 0.88) * 45 : 0;    // accelerate in, then shake on impact
  return [s, from + (to - from) * p + Math.sin(t * f) * sh, vy + Math.cos(t * (f + 13)) * sh, -H * 0.9 * (1 - p)];
};
S.versus = scene(fly(vN, fromN, endN, 70), fly(vS, fromS, endS, 83));

// blast: everything explodes outward (Naruto = orange, Sasuke = blue), then collapses into the globe
S.blast = fill(() => { const a = R() * TAU, e = Math.acos(2 * R() - 1), dd = Math.max(W, H) * r(0.45, 1.25); return [Math.cos(a) * Math.sin(e) * dd, Math.sin(a) * Math.sin(e) * dd * 0.8, Math.cos(e) * dd * 0.25]; });
S.blast.col = new Float32Array(N * 3); for (let i = 0; i < N; i++) S.blast.col.set(i & 1 ? [0.45, 0.65, 1] : [1, 0.62, 0.2], i * 3);


  return S;
}

export default function Particles() {
  const ref = useRef();
  useEffect(() => {
    const dpr = Math.min(devicePixelRatio, N < 30000 ? 1.5 : 2);
    const ren = new THREE.WebGLRenderer({ canvas: ref.current, alpha: true, antialias: false });
    ren.setPixelRatio(dpr);
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 1, 6000);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), K = new Float32Array(N), sz = new Float32Array(N), al = new Float32Array(N);
    for (let i = 0; i < N; i++) { K[i] = r(0.02, 0.06); sz[i] = r(0.8, 1.7); al[i] = r(0.55, 1); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
    const cols = new Float32Array(N * 3).fill(1);
    geo.setAttribute('aCol', new THREE.BufferAttribute(cols, 3));
    const uMouse = { value: new THREE.Vector2(-9999, -9999) };
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uDpr: { value: dpr }, uMouse, uRad: { value: 170 } },
      // 70% brightness at rest, 100% (and slightly bigger = glow) near the cursor
      // vertexShader: 'attribute float aSize;attribute float aAlpha;varying float vA;uniform float uDpr,uRad;uniform vec2 uMouse;void main(){float f=1.-smoothstep(0.,uRad,distance(position.xy,uMouse));vA=aAlpha*(.7+.3*f);gl_PointSize=aSize*uDpr*(1.+.8*f);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      // fragmentShader: 'varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(1.,1.,1.,vA*(1.-smoothstep(.1,.5,d)));}',
      vertexShader: 'attribute float aSize;attribute float aAlpha;attribute vec3 aCol;varying float vA;varying vec3 vC;uniform float uDpr,uRad;uniform vec2 uMouse;void main(){float f=1.-smoothstep(0.,uRad,distance(position.xy,uMouse));float tn=max(aCol.x,max(aCol.y,aCol.z))-min(aCol.x,min(aCol.y,aCol.z));vC=aCol;vA=mix(aAlpha*(.7+.3*f),1.,tn);gl_PointSize=aSize*uDpr*(1.+.8*f)*(1.+1.2*tn);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float vA;varying vec3 vC;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vC,vA*(1.-smoothstep(.1,.5,d)));}',
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);

    const img = new Image(); img.src = '/profile.jpg';
    let S = null, A = 'dust', B = 'dust', mt = 0, W = innerWidth, H = innerHeight, mx = -9999, my = -9999, nx = 0, ny = 0, tx = 0, ty = 0, raf, ry = 0, loaded = false, colWas = false;
    const setup = () => {
      W = innerWidth; H = innerHeight; ren.setSize(W, H, false);
      cam.aspect = W / H; cam.position.z = H / 2 / Math.tan(THREE.MathUtils.degToRad(20)); cam.updateProjectionMatrix();
      if (loaded) S = build(W, H, img, logo, naruto, sasuke);
    };
    // engine.ready = new Promise((res) => { img.onload = () => { loaded = true; setup(); pos.set(S.dust); res(); }; });
    // const logo = new Image(); logo.src = '/logo-mark.png';
    // engine.ready = Promise.all([img, logo].map((im) => new Promise((res) => { im.onload = res; }))).then(() => { loaded = true; setup(); pos.set(S.dust); });
    const logo = new Image(); logo.src = '/logo-mark.png';
    const naruto = new Image(); naruto.src = '/naruto_side.png';
    const sasuke = new Image(); sasuke.src = '/sasuke_side.png';
    engine.ready = Promise.all([img, logo, naruto, sasuke].map((im) => new Promise((res) => { im.onload = res; }))).then(() => { loaded = true; setup(); pos.set(S.dust); });


    engine.setShape = (n) => { A = B = n; mt = 0; };
    engine.morph = (a, b, t) => { A = a; B = b; mt = t; };
    setup();
    const mv = (e) => { mx = e.clientX - W / 2; my = H / 2 - e.clientY; nx = mx / (W / 2); ny = my / (H / 2); uMouse.value.set(mx, my); };
    addEventListener('pointermove', mv); 
    // addEventListener('resize', setup);
    const onResize = () => { if (Math.abs(innerWidth - W) > 2 || Math.abs(innerHeight - H) > 120) setup(); };
    addEventListener('resize', onResize);

    const RAD = 130, RR = RAD * RAD, AMP = 140;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!S) return;
      const t = performance.now() / 1000, a = S[A], b = S[B];
      if (a.upd) a.upd(t); if (b !== a && b.upd) b.upd(t);
      const rw = (REP[A] ? 1 - mt : 0) + (REP[B] ? mt : 0), gw = (A === 'globe' ? 1 - mt : 0) + (B === 'globe' ? mt : 0);
    const ca = a.col || WHITE, cb = b.col || WHITE, colOn = !!(a.col || b.col) || colWas;
      for (let i = 0; i < N; i++) {
        const j = i * 3, k = K[i];
        let e = 0, s = 0;
        if (mt >= 1) e = 1;
        else if (mt > 0) { let l = (mt - DL[i] * 0.4) / 0.6; l = l < 0 ? 0 : l > 1 ? 1 : l; e = l * l * (3 - 2 * l); s = Math.sin(3.1416 * e) * AMP; }
        const x = a[j] + (b[j] - a[j]) * e + RV[j] * s, y = a[j + 1] + (b[j + 1] - a[j + 1]) * e + RV[j + 1] * s, z = a[j + 2] + (b[j + 2] - a[j + 2]) * e + RV[j + 2] * s;
        if (colOn) { cols[j] = ca[j] + (cb[j] - ca[j]) * e; cols[j + 1] = ca[j + 1] + (cb[j + 1] - ca[j + 1]) * e; cols[j + 2] = ca[j + 2] + (cb[j + 2] - ca[j + 2]) * e; }
        vel[j] = vel[j] * 0.87 + (x - pos[j]) * k; vel[j + 1] = vel[j + 1] * 0.87 + (y - pos[j + 1]) * k; vel[j + 2] = vel[j + 2] * 0.87 + (z - pos[j + 2]) * k;
        if (rw > 0.01) { const dx = pos[j] - mx, dy = pos[j + 1] - my, d2 = dx * dx + dy * dy; if (d2 < RR) { const d = Math.sqrt(d2) + 0.01, f = (1 - d / RAD) * 2.4 * rw; vel[j] += (dx / d) * f; vel[j + 1] += (dy / d) * f; vel[j + 2] += f * 0.6; } }
        pos[j] += vel[j]; pos[j + 1] += vel[j + 1]; pos[j + 2] += vel[j + 2];
          }
    colWas = !!(a.col || b.col);
    if (colOn) geo.attributes.aCol.needsUpdate = true;
    geo.attributes.position.needsUpdate = true;
      ry += gw > 0.5 ? 0.004 : (Math.round(ry / TAU) * TAU - ry) * 0.05;
      tx += (-ny * TILT_X - tx) * 0.05; ty += (nx * TILT_Y - ty) * 0.05; // look-at tilt toward the cursor
      pts.rotation.set(tx, ry + ty, 0);
      ren.render(scene, cam);
    };
    loop();
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', mv); removeEventListener('resize', onResize); ren.dispose(); };
  }, []);
  return <canvas aria-hidden="true" ref={ref} className="fx" />;
}
