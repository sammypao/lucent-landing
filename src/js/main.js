/**
 * @file main.js
 * @description Controlador principal para la secuencia de imágenes por scroll y animaciones para LUCENT.
 */

/**
 * Total de frames extraídos de la secuencia.
 */
const FRAME_COUNT = 80;

/**
 * Genera la ruta de cada fotograma.
 * @param {number} index - Índice del fotograma (0 a 79).
 * @returns {string} Ruta absoluta del fotograma.
 */
const getFramePath = (index) => {
  const paddedIndex = String(index).padStart(3, '0');
  return `/media/sequence/frame_${paddedIndex}.jpg`;
};

/**
 * Controlador de la secuencia de imágenes vinculada al desplazamiento (scroll scrubbing).
 */
const initScrollSequenceController = () => {
  const canvas = document.getElementById('hero-canvas');
  const heroTrack = document.getElementById('hero-track');
  if (!canvas || !heroTrack) return;

  const ctx = canvas.getContext('2d');
  const images = [];
  let currentFrameIndex = 0;

  /**
   * Pre-carga todos los fotogramas en memoria.
   */
  const preloadImages = () => {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      if (i === 0) {
        img.onload = () => drawFrame(0);
      }
      images.push(img);
    }
  };

  /**
   * Ajusta las dimensiones del canvas al tamaño del contenedor adaptando la relación de aspecto 'cover'.
   */
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    drawFrame(currentFrameIndex);
  };

  /**
   * Dibuja un fotograma específico en el canvas emulando 'object-fit: cover'.
   * @param {number} index - Índice del fotograma a dibujar.
   */
  const drawFrame = (index) => {
    const img = images[index];
    if (!img || !img.complete) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth || 2752;
    const imgHeight = img.naturalHeight || 1536;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  /**
   * Calcula el fotograma según la posición de scroll y actualiza el canvas.
   */
  let ticking = false;
  const updateSequenceOnScroll = () => {
    const rect = heroTrack.getBoundingClientRect();
    const scrollableDistance = heroTrack.offsetHeight - window.innerHeight;
    
    if (scrollableDistance <= 0) return;

    // Calcular progreso de scroll de 0 a 1 dentro del hero track
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
    const targetIndex = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));

    if (targetIndex !== currentFrameIndex) {
      currentFrameIndex = targetIndex;
      drawFrame(currentFrameIndex);
    }
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateSequenceOnScroll();
        ticking = false;
      });
      ticking = true;
    }
  };

  // Event Listeners
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resizeCanvas);

  // Inicialización
  preloadImages();
  resizeCanvas();
};

/**
 * Configura las animaciones de revelado al hacer scroll (reveal on scroll).
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
        observer.unobserve(entry.target);
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
  initScrollSequenceController();
  initScrollRevealController();
});
