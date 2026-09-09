/**
 * @file main.js
 * @description Controlador principal para la secuencia de imágenes continua a lo largo de toda la página.
 */

/**
 * Total de fotogramas de la secuencia.
 */
const FRAME_COUNT = 80;

/**
 * Devuelve la ruta de cada fotograma numerado.
 * @param {number} index - Índice del fotograma (0 a 79).
 * @returns {string} Ruta absoluta del fotograma.
 */
const getFramePath = (index) => {
  const paddedIndex = String(index).padStart(3, '0');
  return `/media/sequence/frame_${paddedIndex}.jpg`;
};

/**
 * Inicializa el canvas de fondo fijo y vincula el progreso del scroll de toda la web
 * para recorrer fotograma a fotograma la secuencia desde el inicio al final de la página.
 */
const initFullPageSequenceController = () => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const images = [];
  let currentFrameIndex = 0;

  /**
   * Pre-carga los 80 fotogramas en memoria.
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
   * Ajusta las dimensiones del canvas al tamaño del viewport con renderizado 'cover'.
   */
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    drawFrame(currentFrameIndex);
  };

  /**
   * Dibuja un fotograma en el canvas emulando 'object-fit: cover'.
   * @param {number} index - Índice del fotograma.
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
   * Calcula el avance del fotograma según la posición de scroll en toda la web.
   */
  let ticking = false;
  const updateSequenceOnScroll = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    if (maxScroll <= 0) return;

    const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));
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
  updateSequenceOnScroll();
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
  initFullPageSequenceController();
  initScrollRevealController();
});
