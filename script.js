// Menu mobile
const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => {
  burger.classList.toggle("open");
  navLinks.classList.toggle("open");
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    burger.classList.remove("open");
    navLinks.classList.remove("open");
  })
);

// Fond de la barre de navigation au défilement
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
window.addEventListener("scroll", onScroll);
onScroll();

// Animation d'apparition des sections
const observer = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      observer.unobserve(e.target);
    }
  }),
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Galerie défilante : on duplique les images pour une boucle continue
const track = document.querySelector(".gallery-track");
if (track) track.innerHTML += track.innerHTML;

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
