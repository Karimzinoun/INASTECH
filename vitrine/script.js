/**
 * INASTECH — site vitrine
 */
'use strict';

const WHATSAPP_NUMBER = '212661777702';

/* Menu mobile */
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', false);
}));

/* Ombre du header au défilement */
const header = document.getElementById('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* Apparition au défilement */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* Formulaire → message WhatsApp pré-rempli */
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const name = f.name.value.trim();
  const phone = f.phone.value.trim();
  const message = f.message.value.trim();
  const error = document.getElementById('formError');

  if (!name || !phone || !message) {
    error.hidden = false;
    return;
  }
  error.hidden = true;

  const text =
    `Bonjour INASTECH,\n\n` +
    `Nom : ${name}\n` +
    `Téléphone : ${phone}\n` +
    `Service : ${f.service.value}\n\n` +
    `${message}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

document.getElementById('year').textContent = new Date().getFullYear();
