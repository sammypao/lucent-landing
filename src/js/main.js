/**
 * @file main.js
 * @description Controlador principal para la secuencia de imágenes continua y configurador interactivo de pedido LUCENT.
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
 * para recorrer fotograma a fotograma la secuencia desde la primera a la última sección.
 */
const initFullPageSequenceController = () => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const images = [];
  let currentFrameIndex = 0;

  /**
   * Pre-carga los 80 fotogramas en memoria para dibujado instantáneo a 60 fps.
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
    const footer = document.querySelector('.section-fusion-closing');
    const footerHeight = footer ? footer.offsetHeight : 0;

    // El scroll de la secuencia abarca exactamente desde el inicio hasta el comienzo del footer negro
    const sequenceScrollableDistance = Math.max(1, document.documentElement.scrollHeight - window.innerHeight - footerHeight);

    const progress = Math.max(0, Math.min(1, scrollTop / sequenceScrollableDistance));
    const targetIndex = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));

    if (targetIndex !== currentFrameIndex) {
      currentFrameIndex = targetIndex;
      drawFrame(currentFrameIndex);
    }
  };

  /**
   * Controla la aparición en batería progresiva vinculada al scroll para las tarjetas magazine.
   * Cada tarjeta aparece individualmente en pantalla conforme la línea de scroll avanza.
   */
  const updateMagazineCardsOnScroll = () => {
    const cards = document.querySelectorAll('.magazine-spec-card');
    if (cards.length === 0) return;

    const triggerLine = window.innerHeight * 0.82;

    cards.forEach((card) => {
      const cardTop = card.getBoundingClientRect().top;
      if (cardTop < triggerLine) {
        card.classList.add('is-visible');
      } else {
        card.classList.remove('is-visible');
      }
    });
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateSequenceOnScroll();
        updateMagazineCardsOnScroll();
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
  updateMagazineCardsOnScroll();
};

/**
 * Gestor interactivo del configurador de pedido dinámico.
 */
const initOrderFormHandler = () => {
  const form = document.getElementById('order-form');
  const summaryEl = document.getElementById('dynamic-order-summary');
  const successMsg = document.getElementById('order-success-message');
  const chips = document.querySelectorAll('.arch-chip');

  if (!form) return;

  const currentConfig = {
    finish: 'Dorado Pulido',
    lens: 'Ámbar Solar',
    size: 'Standard (48mm)'
  };

  /**
   * Actualiza el texto de resumen de configuración en tiempo real.
   */
  const updateSummary = () => {
    if (summaryEl) {
      summaryEl.textContent = `LUCENT 01 • ${currentConfig.finish} • ${currentConfig.lens} • ${currentConfig.size}`;
    }
  };

  /**
   * Escuchador de eventos para los chips de selección de montura, lente y calibre.
   */
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.group;
      const value = chip.dataset.value;

      if (!group || !value) return;

      // Desactivar chips hermanos del mismo grupo
      const siblingChips = document.querySelectorAll(`.arch-chip[data-group="${group}"]`);
      siblingChips.forEach((c) => c.classList.remove('active'));

      // Activar chip seleccionado
      chip.classList.add('active');

      // Actualizar radio nativo si existe
      const radio = chip.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      // Actualizar objeto de configuración y resumen
      currentConfig[group] = value;
      updateSummary();
    });
  });

  // Envío del formulario
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (form.checkValidity()) {
      if (successMsg) {
        successMsg.classList.add('visible');
      }
      form.reset();
    } else {
      form.reportValidity();
    }
  });
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
  initOrderFormHandler();
  initScrollRevealController();
});
