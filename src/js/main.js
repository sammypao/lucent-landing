/**
 * @file main.js
 * @description Controlador principal de interacciones, animaciones de scroll y gestión de vídeo para la landing de LUCENT.
 */

/**
 * Inicializa el observador de intersección para pausar el vídeo cuando sale de pantalla
 * y reanudarlo únicamente cuando está visible en el viewport.
 */
const initVideoPlaybackController = () => {
  const heroVideo = document.getElementById('hero-video');
  const heroSection = document.getElementById('hero');

  if (!heroVideo || !heroSection) return;

  // Comprobar preferencia de movimiento reducido del usuario
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    heroVideo.pause();
    return;
  }

  // Mantener el vídeo pausado e invisible inicialmente para permitir ver la imagen estática
  heroVideo.pause();
  heroVideo.classList.remove('is-playing');

  // Transcurridos 1.4 segundos mostrando la imagen estática a escala real, iniciar la transición suave hacia el vídeo
  setTimeout(() => {
    const playPromise = heroVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        heroVideo.classList.add('is-playing');
      }).catch(() => {
        // En caso de bloqueo por el navegador, la imagen estática permanece visible sin fallos
      });
    }
  }, 1400);

  // Observador de visibilidad en el viewport
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && !heroVideo.paused) {
        heroVideo.pause();
      }
    });
  }, { threshold: 0.15 });

  videoObserver.observe(heroSection);
};

/**
 * Configura las animaciones de revelado al hacer scroll (reveal on scroll)
 * mediante IntersectionObserver para aplicar opacity y translateY.
 */
const initScrollRevealController = () => {
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // Revelar una única vez
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach((el) => revealObserver.observe(el));
};

/**
 * Manejador principal al cargar el DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
  initVideoPlaybackController();
  initScrollRevealController();
});
