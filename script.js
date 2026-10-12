/* =========================================================
   IAINAS — Interactions
   ========================================================= */

// En-tête : fond sombre dès que l'on défile
const header = document.getElementById("header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Menu mobile
const burger = document.getElementById("burger");
const menu = document.getElementById("menu");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
});
menu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    burger.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  })
);

// Lien du menu actif selon la section visible
const links = [...menu.querySelectorAll("a[href^='#']")];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));

// Apparition des éléments au défilement (avec léger décalage entre voisins)
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

document.querySelectorAll(".reveal").forEach((el) => {
  const group = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  const i = group.indexOf(el);
  if (i > 0) el.style.setProperty("--delay", `${Math.min(i, 6) * 0.1}s`);
  revealObserver.observe(el);
});

// Compteurs animés
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || "";
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1500, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

// FAQ : une seule réponse ouverte à la fois
const faqItems = document.querySelectorAll(".faq details");
faqItems.forEach((item) =>
  item.addEventListener("toggle", () => {
    if (item.open) faqItems.forEach((o) => { if (o !== item) o.open = false; });
  })
);

// Formulaire -> message WhatsApp pré-rempli
document.getElementById("contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const texte =
    `Bonjour, je m'appelle ${data.get("nom")}.\n` +
    `Projet : ${data.get("type")}\n\n` +
    `${data.get("message")}`;
  window.open(`https://wa.me/212661999902?text=${encodeURIComponent(texte)}`, "_blank");
});

// Année du pied de page
document.getElementById("year").textContent = new Date().getFullYear();
