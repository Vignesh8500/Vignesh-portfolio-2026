'use client';
import { useEffect } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Particles, { engine } from '../components/Particles';
import Cursor from '../components/Cursor';
import WavyCard from '../components/WavyCard';

// const PROJECTS = [
//   { n: 'Condor.ai', y: '2026', t: 'Full-time', c: '#5b6cff', u: 'https://condor-ai.com' },
//   { n: 'QS2000', y: '2025', t: 'Full-time', c: '#c2453a', u: '#' },
//   { n: 'Digi-tx', y: '2026', t: 'Full-time', c: '#2f9e8f', u: '#' },
//   { n: 'Sachair', y: '2026', t: 'Freelance', c: '#a8683b', u: 'https://sachair.in' },
// ];
const PROJECTS = [
  { n: 'Condor.ai', y: '2026', t: 'Full-time', u: 'https://condor-ai.com', logo: '/projects/condor-logo.svg', shot: '/projects/condor-home.png' },
  { n: 'QS2000', y: '2026', t: 'Full-time', u: 'https://qs2000.com.au/', logo: '/projects/qs2000-logo.svg', shot: '/projects/qs2000-home.png' },
  { n: 'Digi-tx', y: '2026', t: 'Full-time', u: 'https://digi-tx.com/', logo: '/projects/digitx-logo.svg', shot: '/projects/digitx-home.png' },
  { n: 'Sachair', y: '2026', t: 'Freelance', u: 'https://sachair.in', logo: '/projects/sachair-logo.svg', shot: '/projects/sachair-home.png' },
];
const Words = ({ t }) => t.split(' ').map((w, i) => <span key={i} className="w">{w}{' '}</span>);

const TESTIMONIALS = [
  {
    quote: 'It was a pleasure to work with on the Sachair project. You understood our requirements, communicated clearly throughout the process, and delivered high-quality work with great attention to detail. We’re very happy with the results and would gladly work with you again!',
    name: 'Biswajith Samal',
    role: 'Sach Air (Freelance)',
    company: 'Luminod',
    img: '/clients/biswajith.jpeg', // e.g. '/clients/biswajith.jpeg' (put the file in public/clients/)
  },
];

export default function Home() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    history.scrollRestoration = 'manual'; scrollTo(0, 0);
    // const lenis = new Lenis({ lerp: 0.085 }); lenis.stop();
    // lenis.on('scroll', ScrollTrigger.update);
    // const tick = (t) => lenis.raf(t * 1000); gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    

const lenis = new Lenis({ smoothWheel: false }); lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
// Scroll limiter: each wheel tick counts at most MAX_TICK px, and the page never moves faster than MAX_SPEED px/s
const MAX_TICK = 100, MAX_SPEED = 1200, cl = gsap.utils.clamp;
let want = 0, pos = 0, last = 0;
const onWheel = (e) => {
  if (e.ctrlKey) return;
  e.preventDefault();
  if (lenis.isStopped) return;
  want = cl(0, document.documentElement.scrollHeight - innerHeight, cl(pos - 900, pos + 900, want + cl(-MAX_TICK, MAX_TICK, e.deltaY)));
};
addEventListener('wheel', onWheel, { passive: false });
const tick = (t, dt) => {
  lenis.raf(t * 1000);
  if (Math.abs(scrollY - last) > 40) pos = want = last = scrollY; // scrollbar drag or keyboard moved the page
  const m = (MAX_SPEED * dt) / 1000, step = cl(-m, m, (want - pos) * 0.12);
  window.__sv = step;
  if (Math.abs(step) > 0.01) { pos += step; last = pos; scrollTo(0, pos); }
};
gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);

    let dead = false, ctx, drive = false, secs = [], tops = [];
    // Scroll position -> (shape i, shape i+1, progress). Morph runs while the boundary crosses the viewport.
    const morph = () => {
      if (!drive || !tops.length) return;
      const vh = innerHeight, L = scrollY + vh * 0.5, w = vh * 0.6, s = (k) => tops[k + 1] - vh * 0.25;
      const vi = secs.indexOf('versus');
      if (vi >= 0 && vi < tops.length - 1) { const a0 = tops[vi] + vh * 0.4, a1 = tops[vi + 1] - vh * 0.25; engine.vp = Math.min(1, Math.max(0, (L - a0) / (a1 - a0))); }
      let i = 0; while (i < tops.length - 1 && L >= s(i) + w) i++;
      // if (i >= tops.length - 1) return engine.morph(secs[i], secs[i], 0);
      // engine.morph(secs[i], secs[i + 1], Math.min(1, Math.max(0, (L - s(i)) / w)));

      const fl = document.getElementById('flash');
      if (i >= tops.length - 1) { if (fl) fl.style.opacity = 0; return engine.morph(secs[i], secs[i], 0); }
      const p = Math.min(1, Math.max(0, (L - s(i)) / w));
      if (fl) fl.style.opacity = secs[i + 1] === 'blast' ? Math.sin(Math.PI * p) * 0.4 : 0; // white flash at the explosion
      engine.morph(secs[i], secs[i + 1], p);
    };
    const measure = () => { const el = [...document.querySelectorAll('section[data-shape]')]; secs = el.map((x) => x.dataset.shape); tops = el.map((x) => x.offsetTop); morph(); };
    // lenis.on('scroll', morph); addEventListener('resize', measure);
    lenis.on('scroll', morph); addEventListener('scroll', morph, { passive: true }); addEventListener('resize', measure);

    const initScroll = () => {
      measure();
      ScrollTrigger.create({ trigger: '[data-shape=globe]', start: 'top 55%', end: 'bottom 55%', onToggle: (k) => gsap.to('.arc', { opacity: k.isActive ? 1 : 0, duration: 0.6 }) });
      gsap.utils.toArray('.txt').forEach((t) => gsap.from(t, { opacity: 0, y: 40, duration: 1, scrollTrigger: { trigger: t, start: 'top 85%', toggleActions: 'play none none reverse' } }));
      document.querySelectorAll('.stick').forEach((sec) => gsap.fromTo(sec.querySelectorAll('.w'), { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.9, stagger: 0.03, ease: 'power2.out', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', toggleActions: 'play reverse play reverse' } }));
      gsap.utils.toArray('.tm').forEach((el, i) => gsap.fromTo(el.querySelectorAll('.w,figcaption'), { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.9, stagger: 0.03, ease: 'power2.out', scrollTrigger: { trigger: '.tmsec', start: () => 'top+=' + i * innerHeight + ' top', end: () => 'top+=' + (i + 1) * innerHeight + ' top', toggleActions: 'play reverse play reverse', invalidateOnRefresh: true } }));

      const tk = document.querySelector('.track');
      gsap.to(tk, { x: () => -(tk.scrollWidth - innerWidth), ease: 'none', scrollTrigger: { trigger: '#works', start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true } });
      ScrollTrigger.refresh();
    };
    engine.ready.then(() => {
      if (dead) return;
      document.documentElement.style.setProperty('--lh', engine.logoH + 'px');
const c = document.getElementById('count'), o = { v: 0 }, m = { v: 0 };
ctx = gsap.context(() => {
  gsap.timeline()
    // the logo builds itself out of dust as the percentage rises (no ring or cluster any more)
    .to(o, { v: 100, duration: 3.4, ease: 'power1.inOut', onUpdate: () => { c.textContent = Math.round(o.v) + '%'; engine.morph('dust', 'logo', o.v / 100); } })
    .to({}, { duration: 0.8 })
    .to('#pre', { opacity: 0, duration: 0.5 })
    .to(m, { v: 1, duration: 1.8, ease: 'power2.inOut', onUpdate: () => engine.morph('logo', 'portrait', m.v), onComplete: () => engine.setShape('portrait') }, '<')
    .to('.hero h1, .hero h2', { opacity: 1, y: 0, duration: 1, stagger: 0.15 }, '+=0.2')
    .add(() => { drive = true; lenis.start(); initScroll(); });
});
    });
    // return () => { dead = true; ctx && ctx.revert(); ScrollTrigger.getAll().forEach((k) => k.kill()); gsap.ticker.remove(tick); removeEventListener('resize', measure); lenis.destroy(); };
    return () => { dead = true; ctx && ctx.revert(); ScrollTrigger.getAll().forEach((k) => k.kill()); gsap.ticker.remove(tick); removeEventListener('wheel', onWheel); removeEventListener('scroll', morph); };
  }, []);

  return (
    <main>
      <svg width="0" height="0" style={{ position: 'absolute' }}><filter id="wob"><feTurbulence baseFrequency="0.012 0.02" numOctaves="2" seed="3" /><feDisplacementMap in="SourceGraphic" scale="14" /></filter></svg>
      <Particles /><Cursor />
      <div id="pre"><span id="count">0%</span></div>
      <div id="flash" />
      <svg className="arc" viewBox="0 0 100 100"><defs><path id="a" d="M50,12 a38,38 0 1,1 -0.01,0" /></defs>
       <g className="spin">
          <text><textPath href="#a" startOffset="6%">Available everywhere</textPath></text>
          <text><textPath href="#a" startOffset="56%">Working globally</textPath></text>
        </g>
      </svg>

      <section data-shape="portrait" className="s hero"><h1 className="l">Vignesh Vadde</h1><h2 className="r">Fullstack Developer</h2></section>
      {/* <section data-shape="logo" className="s"><p className="txt tl">I turn ideas into fast, animated, interactive websites. Design-minded development, from CMS builds to custom code.</p></section> */}
      <section data-shape="naruto" className="s stick"><div className="in"><p className="stk right"><Words t="I never give up on a build. Like a Rasengan, every project is layers of ideas spinning into one powerful shape." /></p></div></section>
      <section data-shape="sasuke" className="s stick"><div className="in"><p className="stk left"><Words t="Sharp, fast and precise. Clean code and animation with zero wasted motion, like a Chidori strike." /></p></div></section>
      <section  id="versus" data-shape="versus"  className="s" />
      <section data-shape="blast" className="s" />
      <section data-shape="globe" className="s" />
      <section data-shape="india" className="s"><p className="txt mid">Based in India</p></section>
      <section data-shape="logos" className="s stick"><div className="in"><p className="stk left"><Words t="Specialized in Webflow, WordPress with GSAP animation." /></p></div></section>
      <section data-shape="automation" className="s stick"><div className="in"><p className="stk right"><Words t="Specialized in automations too. I connected Outlook to Zoho: AI reads every incoming email, filters out spam and fraud, and turns genuine enquiries into leads automatically." /></p></div></section>
      <section data-shape="helix" className="s stick"><div className="in"><p className="stk right"><Words t="I don’t just build what’s in the design. I add motion, interaction and performance wherever they genuinely elevate the work." /></p></div></section>
      <section data-shape="wave" id="works" className="s">
        <div className="pin"><small>Some selected works</small>
          <div className="track">
            {PROJECTS.map((p) => (
                <a key={p.n} data-hover className="card" href={p.u} target="_blank" rel="noreferrer">
                  <WavyCard name={p.n} logo={p.logo} shot={p.shot} bg={p.bg} />
                <div className="meta"><b>{p.n}</b><i>{p.t} · {p.y}</i></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section data-shape="quote" className="s tmsec" style={{ height: `${100 + TESTIMONIALS.length * 100}vh` }}>
        <div className="in"><div className="tms">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="tm">
              <blockquote className="stk right"><Words t={t.quote} /></blockquote>
              <figcaption>
                {t.img ? <img src={t.img} alt={t.name} /> : <span className="av">{t.name[0]}</span>}
                <span><b>{t.name}</b><i>{t.role} · {t.company}</i></span>
              </figcaption>
            </figure>
          ))}
        </div></div>
      </section>

      <section data-shape="spiral" className="s"><p className="txt tl">And still working on plenty more.</p></section>
      <section data-shape="frame" className="s contact">
        <div className="box"><small>Get in touch</small>
          <a className="big" data-hover href="mailto:vaddevignesh123@gmail.com">vaddevignesh123@gmail.com</a>
          <p>or reach out on <a data-hover href="https://linkedin.com/in/vigneshvadde" target="_blank" rel="noreferrer">LinkedIn</a> · <a data-hover href="https://github.com/vigneshvadde" target="_blank" rel="noreferrer">GitHub</a></p></div>
        <div className="foot"><span>Vignesh Vadde · © 2026</span><span>Built with Next.js, Three.js & GSAP</span></div>
      </section>
    </main>
  );
}
