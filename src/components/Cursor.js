'use client';
import { useEffect, useRef } from 'react';

export default function Cursor() {
  const ref = useRef();
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d'), dpr = Math.min(devicePixelRatio, 2);
    let w, h;
    const rs = () => { w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); };
    rs();
    const m = { x: -100, y: -100 }, p = { x: -100, y: -100 }, tr = [];
    let ring = 0, hov = false, raf;
    const mv = (e) => { m.x = e.clientX; m.y = e.clientY; hov = !!e.target.closest?.('a,button,[data-hover]'); };
    addEventListener('resize', rs); addEventListener('pointermove', mv);
    const loop = () => {
      p.x += (m.x - p.x) * 0.35; p.y += (m.y - p.y) * 0.35;
      tr.push({ x: p.x, y: p.y }); if (tr.length > 18) tr.shift();
      x.clearRect(0, 0, w, h);
      x.lineCap = 'round';
      for (let i = 1; i < tr.length; i++) { // comet trail: long when fast, collapses when slow
        const a = i / tr.length;
        x.strokeStyle = `rgba(255,255,255,${a * 0.85})`; x.lineWidth = a * 5;
        x.beginPath(); x.moveTo(tr[i - 1].x, tr[i - 1].y); x.lineTo(tr[i].x, tr[i].y); x.stroke();
      }
      ring += ((hov ? 1 : 0) - ring) * 0.15;
      x.save(); x.shadowColor = '#fff'; x.shadowBlur = 12; x.fillStyle = '#fff';
      x.beginPath(); x.arc(p.x, p.y, 3.5 * (1 - ring * 0.7), 0, 6.283); x.fill(); x.restore();
      if (ring > 0.02) { x.strokeStyle = `rgba(255,255,255,${ring})`; x.lineWidth = 1.2; x.beginPath(); x.arc(p.x, p.y, 8 + ring * 14, 0, 6.283); x.stroke(); }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', rs); removeEventListener('pointermove', mv); };
  }, []);
  return <canvas aria-hidden="true" ref={ref} className="cur" />;
}
