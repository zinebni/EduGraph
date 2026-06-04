/**
 * EduGraph Presentation — script.js
 * ============================================================
 * Controls:
 *   – Slide navigation: keyboard (←→ Space Home End), mouse
 *     wheel, swipe/touch, HUD buttons, dot nav clicks
 *   – Smooth CSS transitions with entrance/exit states
 *   – Progress bar + slide counter HUD updates
 *   – Per-slide entrance animations (timeline, counters,
 *     roadmap stagger, tech pills, conclusion items)
 *   – Animated travel-dot on architecture arrows
 *   – Supervisor card pulse ring
 *   – Radial mesh background per slide
 *   – Cursor-following glow on cards
 *   – Fullscreen toggle
 *   – Keyboard-hint auto-hide
 * ============================================================
 */

'use strict';

/* ════════════════════════════════════════════════════════════
   CONSTANTS & STATE
════════════════════════════════════════════════════════════ */
const TOTAL_SLIDES    = 7;
const TRANSITION_MS   = 580;   // must match CSS transition duration
const WHEEL_THROTTLE  = 700;   // ms between wheel-triggered slides

let current      = 0;           // 0-indexed active slide
let animating    = false;        // debounce flag
let wheelLocked  = false;
let hintTimer    = null;

/* ════════════════════════════════════════════════════════════
   DOM REFERENCES
════════════════════════════════════════════════════════════ */
const $slides       = Array.from(document.querySelectorAll('.slide'));
const $progressFill = document.getElementById('progress-bar-fill');
const $counter      = document.getElementById('slide-counter');
const $prevBtn      = document.getElementById('prev-btn');
const $nextBtn      = document.getElementById('next-btn');
const $fsBtn        = document.getElementById('fullscreen-btn');
const $dotNav       = document.getElementById('dot-nav');
const $hint         = document.getElementById('keyboard-hint');
const $presentation = document.getElementById('presentation');

/* ════════════════════════════════════════════════════════════
   SLIDE NAMES (for dot tooltips)
════════════════════════════════════════════════════════════ */
const SLIDE_NAMES = [
  'Hero', 'Goal & Overview', 'System Architecture', 'LangGraph Workflow',
  'AI Agents', 'Tech Stack', 'Conclusion'
];

/* ════════════════════════════════════════════════════════════
   BACKGROUND GRADIENTS (one per slide)
════════════════════════════════════════════════════════════ */
const BG = [
  'radial-gradient(at 0% 0%,    rgba(99,102,241,.06) 0px, transparent 60%)',  // 1 Hero
  'radial-gradient(at 100% 0%,  rgba(16,185,129,.05) 0px, transparent 60%)',  // 2 Goal & Overview
  'radial-gradient(at 50% 0%,   rgba(79,70,229,.06)  0px, transparent 60%)',  // 3 Arch
  'radial-gradient(at 0% 50%,   rgba(99,102,241,.05) 0px, transparent 60%)',  // 4 Workflow
  'radial-gradient(at 100% 100%,rgba(219,39,119,.04) 0px, transparent 60%)',  // 5 Agents
  'radial-gradient(at 0% 0%,    rgba(16,185,129,.04) 0px, transparent 60%)',  // 6 Tech
  'radial-gradient(at 50% 50%,  rgba(99,102,241,.06) 0px, transparent 60%)',  // 7 Conclusion
];

/* ════════════════════════════════════════════════════════════
   UPDATE HUD CHROME
════════════════════════════════════════════════════════════ */
function updateChrome(idx) {
  // Progress bar
  $progressFill.style.width = `${((idx + 1) / TOTAL_SLIDES) * 100}%`;

  // Counter
  $counter.textContent =
    `${String(idx + 1).padStart(2, '0')} / ${String(TOTAL_SLIDES).padStart(2, '0')}`;

  // Nav buttons
  $prevBtn.disabled = idx === 0;
  $nextBtn.disabled = idx === TOTAL_SLIDES - 1;

  // Dot active state
  $dotNav.querySelectorAll('.dot').forEach((d, i) =>
    d.classList.toggle('active', i === idx));

  // Background mesh
  $presentation.style.backgroundImage = BG[idx];
}

/* ════════════════════════════════════════════════════════════
   CORE SLIDE TRANSITION
════════════════════════════════════════════════════════════ */
function goToSlide(target) {
  if (animating || target === current || target < 0 || target >= TOTAL_SLIDES) return;

  animating = true;
  const out = $slides[current];
  const inn = $slides[target];
  const forward = target > current;

  // Exit outgoing slide
  out.classList.remove('active');
  out.classList.add('exit-left');

  // Position incoming off-screen, then let CSS transition bring it in
  inn.style.transition  = 'none';
  inn.style.transform   = forward ? 'translateX(60px) scale(0.98)' : 'translateX(-60px) scale(0.98)';
  inn.style.opacity     = '0';
  inn.classList.add('active');

  // Trigger transition on next paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      inn.style.transition = '';
      inn.style.transform  = '';
      inn.style.opacity    = '';
      inn.scrollTop        = 0;

      // Fire slide-specific entrance animations
      onSlideEnter(target);
    });
  });

  current = target;
  updateChrome(current);

  // Unlock after transition completes
  setTimeout(() => {
    out.classList.remove('exit-left');
    out.style.transform = '';
    out.style.opacity   = '';
    animating = false;
  }, TRANSITION_MS);
}

function next() { goToSlide(current + 1); }
function prev() { goToSlide(current - 1); }

/* ════════════════════════════════════════════════════════════
   PER-SLIDE ENTRANCE ANIMATIONS
════════════════════════════════════════════════════════════ */
function onSlideEnter(idx) {
  const slide = $slides[idx];

  // Re-trigger CSS keyframe animations on staggered elements
  slide.querySelectorAll('.animate-slide-up, .animate-fade-in').forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth; // force reflow
    el.style.animation = '';
  });

  // Per-slide
  switch (idx) {
    case 3:  animateTimeline();           break;  // Slide 4 – Workflow
    case 5:  setTimeout(animateTechPills, 200);   break;  // Slide 6 – Tech Stack
    case 6:  animateConclusionItems();    break;  // Slide 7 – Conclusion
  }
}

/* ════════════════════════════════════════════════════════════
   TIMELINE ANIMATION  (Slide 6)
════════════════════════════════════════════════════════════ */
function animateTimeline() {
  const steps = document.querySelectorAll('#slide-4 .timeline-step');
  steps.forEach(s => s.classList.remove('visible'));
  steps.forEach((s, i) => setTimeout(() => s.classList.add('visible'), i * 150 + 80));
}

/* ════════════════════════════════════════════════════════════
   COUNTER ANIMATION  (Slide 10)
════════════════════════════════════════════════════════════ */
function animateCounters() {
  document.querySelectorAll('#slide-7 .metric-value[data-target]').forEach(el => {
    const target   = parseInt(el.dataset.target, 10);
    const label    = el.nextElementSibling?.textContent ?? '';
    const suffix   = label.includes('min') || label.includes('modules') ? ''
                   : label.includes('question') ? '+'
                   : '%';
    const duration = 1400;
    const t0       = performance.now();

    (function tick(now) {
      const progress = Math.min((now - t0) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + (progress === 1 ? suffix : '');
      if (progress < 1) requestAnimationFrame(tick);
    })(t0);
  });
}

/* ════════════════════════════════════════════════════════════
   ROADMAP STAGGER  (Slide 11)
════════════════════════════════════════════════════════════ */
function animateRoadmap() {
  document.querySelectorAll('#slide-8 .roadmap-item').forEach((item, i) => {
    Object.assign(item.style, { opacity: '0', transform: 'translateY(16px)',
      transition: 'opacity .4s ease, transform .4s ease' });
    setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'translateY(0)'; },
      i * 70 + 150);
  });
}

/* ════════════════════════════════════════════════════════════
   TECH PILLS STAGGER  (Slide 9)
════════════════════════════════════════════════════════════ */
function animateTechPills() {
  document.querySelectorAll('#slide-6 .tech-pill').forEach((pill, i) => {
    Object.assign(pill.style, { opacity: '0', transform: 'scale(0.88)',
      transition: 'opacity .3s ease, transform .3s ease' });
    setTimeout(() => { pill.style.opacity = '1'; pill.style.transform = 'scale(1)'; },
      i * 45 + 200);
  });
}

/* ════════════════════════════════════════════════════════════
   CONCLUSION ITEMS STAGGER  (Slide 12)
════════════════════════════════════════════════════════════ */
function animateConclusionItems() {
  document.querySelectorAll('#slide-7 .conclusion-list li').forEach((li, i) => {
    Object.assign(li.style, { opacity: '0', transform: 'translateX(-12px)',
      transition: 'opacity .4s ease, transform .4s ease' });
    setTimeout(() => { li.style.opacity = '1'; li.style.transform = 'translateX(0)'; },
      i * 80 + 350);
  });
}

/* ════════════════════════════════════════════════════════════
   HERO STAT CARDS ENTRANCE  (Slide 1, on load)
════════════════════════════════════════════════════════════ */
function animateHeroStats() {
  document.querySelectorAll('#slide-1 .glass-card').forEach((card, i) => {
    Object.assign(card.style, { opacity: '0', transform: 'translateY(14px)',
      transition: 'opacity .5s ease, transform .5s ease' });
    setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; },
      i * 120 + 650);
  });
}

/* ════════════════════════════════════════════════════════════
   ARCHITECTURE DIAGRAM — traveling dot on arrows
════════════════════════════════════════════════════════════ */
function enhanceArchDiagram() {
  // Inject keyframe once
  const style = document.createElement('style');
  style.textContent = `
    @keyframes travel-dot {
      0%   { top: 0%;   opacity: 0; }
      15%  { opacity: 1; }
      85%  { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.querySelectorAll('#slide-3 .arch-arrow').forEach(arrow => {
    arrow.style.position = 'relative';
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:absolute; width:6px; height:6px; border-radius:50%;
      background:var(--accent-primary); left:50%; transform:translateX(-50%);
      top:0; animation:travel-dot 1.8s ease-in-out infinite;
      box-shadow:0 0 6px rgba(99,102,241,.55); pointer-events:none;
    `;
    arrow.appendChild(dot);
  });
}

/* ════════════════════════════════════════════════════════════
   SUPERVISOR CARD PULSE RING  (Slide 7)
════════════════════════════════════════════════════════════ */
function addSupervisorPulse() {
  const card = document.querySelector('#slide-5 .agent-card');
  if (!card) return;
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute; inset:-1px; border-radius:var(--radius-lg);
    border:1.5px solid rgba(245,158,11,.3);
    animation:pulse-ring 3s ease-in-out infinite; pointer-events:none;
  `;
  card.style.position = 'relative';
  card.appendChild(ring);
}

/* ════════════════════════════════════════════════════════════
   CURSOR RADIAL GLOW  (micro-delight on cards)
════════════════════════════════════════════════════════════ */
function addCursorGlow(selector) {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
      const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
      card.style.background =
        `radial-gradient(circle at ${x}% ${y}%, rgba(99,102,241,.045) 0%, #ffffff 55%)`;
    });
    card.addEventListener('mouseleave', () => { card.style.background = ''; });
  });
}

/* ════════════════════════════════════════════════════════════
   DOT NAVIGATOR
════════════════════════════════════════════════════════════ */
function buildDotNav() {
  SLIDE_NAMES.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = `dot${i === 0 ? ' active' : ''}`;
    btn.setAttribute('aria-label', `Slide ${i + 1}: ${name}`);
    btn.title = `${i + 1}. ${name}`;
    btn.addEventListener('click', () => goToSlide(i));
    $dotNav.appendChild(btn);
  });
}

/* ════════════════════════════════════════════════════════════
   KEYBOARD HINT
════════════════════════════════════════════════════════════ */
function showHint() {
  $hint.style.opacity = '1';
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { $hint.style.opacity = '0'; }, 2800);
}

/* ════════════════════════════════════════════════════════════
   FULLSCREEN
════════════════════════════════════════════════════════════ */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement;
  $fsBtn.style.color = active ? 'var(--accent-primary)' : '';
  $fsBtn.title = active ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F)';
});

/* ════════════════════════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════════════════════════ */

// ── HUD buttons
$prevBtn.addEventListener('click', prev);
$nextBtn.addEventListener('click', next);
$fsBtn.addEventListener('click', toggleFullscreen);

// ── Keyboard
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
      e.preventDefault();
      next();
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      prev();
      break;
    case 'f': case 'F':
      toggleFullscreen();
      break;
    case 'Escape':
      if (document.fullscreenElement) document.exitFullscreen();
      break;
    case 'Home':
      goToSlide(0);
      break;
    case 'End':
      goToSlide(TOTAL_SLIDES - 1);
      break;
    default: return; // don't call showHint for unrelated keys
  }
  showHint();
});

// ── Mouse wheel (Horizontal trackpad swipes only)
document.addEventListener('wheel', e => {
  if (wheelLocked) return;

  // Only transition on horizontal trackpad swipe
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 8) {
    if (e.deltaX > 0) {
      next();
    } else {
      prev();
    }
    wheelLocked = true;
    setTimeout(() => { wheelLocked = false; }, WHEEL_THROTTLE);
  }
}, { passive: true });

// ── Touch / swipe
let tx = 0, ty = 0;
document.addEventListener('touchstart', e => {
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = tx - e.changedTouches[0].clientX;
  const dy = ty - e.changedTouches[0].clientY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    dx > 0 ? next() : prev();
  }
}, { passive: true });

// ── Click anywhere shows hint
document.addEventListener('click', showHint);

/* ════════════════════════════════════════════════════════════
   BOOTSTRAP  (runs when DOM is ready)
════════════════════════════════════════════════════════════ */
function init() {
  buildDotNav();
  updateChrome(0);

  // Slide-specific enhancements
  enhanceArchDiagram();
  addSupervisorPulse();

  // Cursor glow on interactive cards
  addCursorGlow('.feature-card');
  addCursorGlow('.agent-card');
  addCursorGlow('.glass-card');
  addCursorGlow('.problem-card');
  addCursorGlow('.metric-card');
  addCursorGlow('.roadmap-item');
  addCursorGlow('.technique-card');

  // Animate Slide 1 hero stat cards
  animateHeroStats();

  // Auto-hide keyboard hint after 4 s
  hintTimer = setTimeout(() => { $hint.style.opacity = '0'; }, 4000);

  // Dev console branding
  console.log(
    '%c🧠 EduGraph%c  Presentation\n%cUse ← → arrows, scroll, or swipe to navigate · F = fullscreen',
    'color:#4f46e5;font-size:20px;font-weight:800;font-family:Outfit,sans-serif;',
    'color:#7c3aed;font-size:16px;font-weight:700;',
    'color:#475569;font-size:13px;'
  );
  console.table({
    '→  ↓  Space': 'Next slide',
    '←  ↑':        'Prev slide',
    'Home':         'First slide',
    'End':          'Last slide',
    'F':            'Toggle fullscreen',
    'Esc':          'Exit fullscreen',
  });
}

// Expose globally for any inline onclick="goToSlide(n)" in HTML
window.goToSlide = goToSlide;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
