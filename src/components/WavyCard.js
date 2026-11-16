'use client';
import { useEffect, useRef } from 'react';

const load = (src) => new Promise((res) => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

export default function WavyCard({ name, logo, shot, fit = 'cover', bg = '#1b1b1f' }) {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d'), dpr = Math.min(devicePixelRatio, 2), box = c.parentElement;
    const layer = document.createElement('canvas'), lx = layer.getContext('2d');
    let imgs = [null, null], hov = 0, target = 0, raf, w = 0, h = 0;
    Promise.all([load(logo), load(shot)]).then((r) => { imgs = r; });
    const rs = () => { w = c.width = Math.round(c.clientWidth * dpr); h = c.height = Math.round(c.clientHeight * dpr); };
    rs(); const ro = new ResizeObserver(rs); ro.observe(c);
    const over = () => (target = 1), out = () => (target = 0);
    box.addEventListener('mouseenter', over); box.addEventListener('mouseleave', out);
    const paint = (img, label, mode) => { // draws into `layer` using the current globalAlpha
      const rw = layer.width, rh = layer.height;
      lx.fillStyle = bg; lx.fillRect(0, 0, rw, rh);
      if (!img) { const gr = lx.createLinearGradient(0, 0, rw, rh); gr.addColorStop(0, '#1b1b1f'); gr.addColorStop(1, '#2f2f36'); lx.fillStyle = gr; lx.fillRect(0, 0, rw, rh); lx.fillStyle = 'rgba(255,255,255,.55)'; lx.font = `${rw * 0.028}px sans-serif`; lx.textAlign = 'center'; lx.fillText(label, rw / 2, rh / 2); return; }
    //   const k = mode === 'contain' ? Math.min(rw / img.width, rh / img.height) * 0.55 : Math.max(rw / img.width, rh / img.height);
    const k = mode === 'contain' ? Math.min(rw * 0.4 / img.width, rh * 0.4 / img.height) : Math.max(rw / img.width, rh / img.height);
      lx.drawImage(img, (rw - img.width * k) / 2, (rh - img.height * k) / 2, img.width * k, img.height * k);
    };
    const loop = (tm) => {
      raf = requestAnimationFrame(loop);
      if (!w) return;
      hov += (target - hov) * 0.1;
      const rh = Math.round(h * 10 / 11), pad = (h - rh) / 2, t = tm / 1000;
      if (layer.width !== w || layer.height !== rh) { layer.width = w; layer.height = rh; }
    //   lx.globalAlpha = 1; paint(imgs[0], name, fit);
    lx.globalAlpha = 1; paint(imgs[0], name, 'contain');
      if (hov > 0.01) { lx.globalAlpha = hov; paint(imgs[1], 'Home page', 'cover'); lx.globalAlpha = 1; }
      x.clearRect(0, 0, w, h);
      const amp = (5 + Math.min(14, Math.abs(window.__sv || 0) * 0.6)) * dpr, n = 56, sw = w / n;
      for (let i = 0; i < n; i++) { // vertical strips offset by a travelling sine wave (left -> right)
        const u = i / n, ph = u * 5.5 - t * 2.4, f = 0.25 + 0.75 * u, dy = Math.sin(ph) * amp * f;
        x.drawImage(layer, i * sw, 0, sw, rh, i * sw, pad + dy, sw + 1, rh);
        const sh = Math.cos(ph) * f * 0.12; // light and shadow on the folds
        x.fillStyle = sh > 0 ? `rgba(255,255,255,${sh * 0.6})` : `rgba(0,0,0,${-sh})`;
        x.fillRect(i * sw, pad + dy, sw + 1, rh);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); box.removeEventListener('mouseenter', over); box.removeEventListener('mouseleave', out); };
  }, [logo, shot, name, fit, bg]);
  return <canvas ref={ref} className="cv" />;
}