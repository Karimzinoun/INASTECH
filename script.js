/* =========================================================
   IAINAS — Interactions
   ========================================================= */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- Défilement fluide (Lenis) ---------- */
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4) });
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

// Liens internes : défilement doux vers la section
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (e) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -80 });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  });
});

/* ---------- Menu mobile ---------- */
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
function closeMenu() {
  burger.classList.remove("open");
  navLinks.classList.remove("open");
  burger.setAttribute("aria-expanded", "false");
}
burger.addEventListener("click", () => {
  const open = !navLinks.classList.contains("open");
  burger.classList.toggle("open", open);
  navLinks.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
});

/* ---------- Navigation : fond, masquage, barre de progression ---------- */
const nav = document.getElementById("nav");
const progress = document.getElementById("progress");
let lastY = 0;
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  nav.classList.toggle("scrolled", y > 30);
  nav.classList.toggle("hidden", y > lastY && y > 400 && !navLinks.classList.contains("open"));
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  lastY = y;
  updateTimeline();
  updateParallax();
}
window.addEventListener("scroll", onScroll, { passive: true });

/* ---------- Lien actif dans le menu ---------- */
const sections = [...document.querySelectorAll("main section[id]")];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    document.querySelectorAll(".nav-links a[data-link]").forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`)
    );
  });
}, { rootMargin: "-45% 0px -50% 0px" });
sections.forEach((s) => sectionObserver.observe(s));

/* ---------- Titres découpés mot par mot ---------- */
document.querySelectorAll(".split").forEach((el) => {
  let i = 0;
  const wrap = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span");
          w.className = "w";
          const inner = document.createElement("span");
          inner.textContent = part;
          inner.style.setProperty("--d", `${i++ * 0.07}s`);
          w.append(inner);
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        wrap(child);
      }
    });
  };
  wrap(el);
});

/* ---------- Apparitions au défilement (avec décalage) ---------- */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal, .split, .footer-word").forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  const index = siblings.indexOf(el);
  if (index > 0) el.style.setProperty("--d", `${Math.min(index, 8) * 0.08}s`);
  revealObserver.observe(el);
});

/* ---------- Mots qui tournent dans le titre ---------- */
const rotator = document.getElementById("rotator");
if (rotator) {
  const words = [...rotator.querySelectorAll("em")];
  let current = 0;
  const fit = () => { rotator.style.width = `${words[current].offsetWidth}px`; };
  document.fonts.ready.then(fit);
  window.addEventListener("resize", fit);
  if (!reduceMotion) {
    setInterval(() => {
      const prev = words[current];
      current = (current + 1) % words.length;
      prev.classList.remove("active");
      prev.classList.add("out");
      words[current].classList.remove("out");
      words[current].classList.add("active");
      fit();
      setTimeout(() => prev.classList.remove("out"), 700);
    }, 2600);
  }
}

/* ---------- Compteurs animés ---------- */
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    const start = performance.now();
    const duration = 1600;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

/* ---------- Ligne de progression de la méthode ---------- */
const timeline = document.getElementById("timeline");
const tlFill = document.getElementById("tlFill");
function updateTimeline() {
  if (!timeline) return;
  const r = timeline.getBoundingClientRect();
  const p = (window.innerHeight * 0.6 - r.top) / r.height;
  tlFill.style.transform = `scaleY(${Math.max(0, Math.min(1, p))})`;
}

/* ---------- Parallaxe de la photo "À propos" ---------- */
const parallaxEls = [...document.querySelectorAll(".parallax")];
function updateParallax() {
  if (reduceMotion) return;
  parallaxEls.forEach((el) => {
    const r = el.parentElement.getBoundingClientRect();
    const offset = (r.top + r.height / 2 - window.innerHeight / 2) * +el.dataset.speed;
    el.style.transform = `translateY(${offset - r.height * 0.07}px)`;
  });
}

/* ---------- Effets à la souris (ordinateur uniquement) ---------- */
if (finePointer && !reduceMotion) {
  document.body.classList.add("has-mouse");

  // Halo qui suit le curseur
  const glow = document.getElementById("cursorGlow");
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    gx += (tx - gx) * 0.12;
    gy += (ty - gy) * 0.12;
    glow.style.transform = `translate(${gx - 260}px, ${gy - 260}px)`;
    requestAnimationFrame(loop);
  })();

  // Photos flottantes du hero : effet de profondeur
  const floats = [...document.querySelectorAll(".float")];
  const hero = document.querySelector(".hero");
  hero.addEventListener("mousemove", (e) => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    floats.forEach((f) => {
      const d = +f.dataset.depth;
      f.style.transform = `translate(${-x * d}px, ${-y * d}px) rotate(var(--r))`;
    });
  });

  // Aperçu d'image qui suit la souris sur les services
  const preview = document.getElementById("srvPreview");
  const previewImg = preview.querySelector("img");
  let px = 0, py = 0, cx = 0, cy = 0, active = false;
  document.querySelectorAll(".srv").forEach((row) => {
    row.addEventListener("mouseenter", () => {
      previewImg.src = row.dataset.img;
      preview.classList.add("show");
      active = true;
    });
    row.addEventListener("mouseleave", () => { preview.classList.remove("show"); active = false; });
  });
  window.addEventListener("mousemove", (e) => { px = e.clientX + 170; py = e.clientY; });
  (function follow() {
    cx += (px - cx) * 0.15;
    cy += (py - cy) * 0.15;
    if (active || preview.classList.contains("show")) {
      preview.style.left = `${cx}px`;
      preview.style.top = `${cy}px`;
    }
    requestAnimationFrame(follow);
  })();

  // Boutons "magnétiques"
  document.querySelectorAll(".magnetic").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });
}

/* ---------- Bandeaux défilants : duplication pour une boucle continue ---------- */
document.querySelectorAll(".ticker-track, .gallery-track").forEach((track) => {
  track.innerHTML += track.innerHTML;
});

/* ---------- FAQ : une seule question ouverte à la fois ---------- */
const faqItems = document.querySelectorAll(".faq details");
faqItems.forEach((item) => {
  item.addEventListener("toggle", () => {
    if (item.open) faqItems.forEach((other) => { if (other !== item) other.open = false; });
  });
});

/* ---------- Formulaire -> message WhatsApp pré-rempli ---------- */
document.getElementById("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const texte =
    `Bonjour, je m'appelle ${data.get("nom")}.\n` +
    `Projet : ${data.get("type")}\n\n` +
    `${data.get("message")}`;
  window.open(`https://wa.me/212661999902?text=${encodeURIComponent(texte)}`, "_blank");
});

/* ---------- Divers ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
onScroll();
