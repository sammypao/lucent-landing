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
  const posterFallback = document.getElementById('hero-poster-fallback');
  const heroSection = document.getElementById('hero');

  if (!heroVideo || !heroSection) return;

  // Comprobar preferencia de movimiento reducido del usuario
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    heroVideo.pause();
    if (posterFallback) posterFallback.style.display = 'block';
    return;
  }

  // Intentar reproducción inicial silenciosa de forma segura
  const playPromise = heroVideo.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Si la reproducción automática es bloqueada por el navegador, se muestra el póster
      if (posterFallback) posterFallback.style.display = 'block';
    });
  }

  // Observador de visibilidad en viewport
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (heroVideo.paused) {
          heroVideo.play().catch(() => {});
        }
      } else {
        if (!heroVideo.paused) {
          heroVideo.pause();
        }
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
