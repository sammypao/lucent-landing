/**
 * @file main.js
 * @description Controlador principal para la secuencia de imágenes continua y configurador interactivo de pedido LUCENT.
 */

/**
 * Total de fotogramas de la secuencia.
 */
const FRAME_COUNT = 80;

/**
 * Factor de suavizado del scroll (0 a 1). Valores bajos = más inercia.
 */
const SCROLL_EASE = 0.14;

/**
 * Umbral por debajo del cual se considera que la secuencia alcanzó su destino.
 */
const SETTLE_EPSILON = 0.0002;

/**
 * Fotogramas cargados de forma inmediata antes de repartir el resto en cola.
 */
const PRIORITY_FRAMES = 10;

/**
 * Descargas simultáneas máximas para el resto de la secuencia.
 */
const LOAD_CONCURRENCY = 6;

/**
 * Devuelve la ruta de cada fotograma numerado.
 * @param {number} index - Índice del fotograma (0 a 79).
 * @returns {string} Ruta absoluta del fotograma.
 */
const getFramePath = (index) => {
  const paddedIndex = String(index).padStart(3, '0');
  return `${import.meta.env.BASE_URL}media/sequence/frame_${paddedIndex}.webp`;
};

/**
 * Inicializa el canvas de fondo fijo y vincula el progreso del scroll de toda la web
 * para recorrer fotograma a fotograma la secuencia desde la primera a la última sección.
 *
 * El avance es continuo: entre cada par de fotogramas se interpola una disolvencia
 * proporcional al scroll, y el progreso persigue a la posición real con inercia. Así la
 * secuencia se percibe como vídeo y no como un pase de diapositivas.
 */
const initFullPageSequenceController = () => {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const images = new Array(FRAME_COUNT);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let targetProgress = 0;
  let currentProgress = 0;
  let isAnimating = false;
  let lastFrameTime = 0;

  /**
   * Métricas de layout cacheadas. Leerlas en cada evento de scroll obliga al navegador
   * a recalcular el layout 60 veces por segundo, así que solo se recalculan al redimensionar.
   */
  const metrics = { scrollableDistance: 1 };

  const measure = () => {
    const footer = document.querySelector('.section-fusion-closing');
    const footerHeight = footer ? footer.offsetHeight : 0;
    // La secuencia abarca desde el inicio hasta el comienzo del footer negro.
    metrics.scrollableDistance = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight - footerHeight
    );
  };

  /**
   * Carga un fotograma concreto y redibuja si es el que se está mostrando.
   * @param {number} index - Índice del fotograma.
   * @returns {Promise<void>} Se resuelve tanto si carga como si falla.
   */
  const loadFrame = (index) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      images[index] = img;
      requestRender();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = getFramePath(index);
  });

  /**
   * Carga los primeros fotogramas de inmediato y reparte el resto en una cola con
   * concurrencia limitada, para no saturar la conexión con 80 peticiones a la vez.
   */
  const preloadImages = async () => {
    const priority = Math.min(PRIORITY_FRAMES, FRAME_COUNT);
    await Promise.all(
      Array.from({ length: priority }, (_, i) => loadFrame(i))
    );

    if (prefersReducedMotion) return;

    let next = priority;
    const worker = async () => {
      while (next < FRAME_COUNT) {
        await loadFrame(next++);
      }
    };
    await Promise.all(
      Array.from({ length: LOAD_CONCURRENCY }, () => worker())
    );
  };

  /**
   * Devuelve el fotograma pedido o, si aún no ha llegado, el cargado más cercano.
   * Evita que el fondo se quede en blanco mientras la secuencia todavía descarga.
   * @param {number} index - Índice deseado.
   * @returns {HTMLImageElement|null} Imagen utilizable o null.
   */
  const resolveFrame = (index) => {
    if (images[index]) return images[index];
    for (let offset = 1; offset < FRAME_COUNT; offset++) {
      if (images[index - offset]) return images[index - offset];
      if (images[index + offset]) return images[index + offset];
    }
    return null;
  };

  /**
   * Ajusta las dimensiones del canvas al tamaño del viewport con renderizado 'cover'.
   * El ratio de píxel se limita a 2 para no generar lienzos enormes en móviles de alta densidad.
   */
  const resizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    measure();
    render();
  };

  /**
   * Dibuja una imagen en el canvas emulando 'object-fit: cover'.
   * @param {HTMLImageElement} img - Imagen a dibujar.
   * @param {number} alpha - Opacidad de dibujado (0 a 1).
   */
  const paint = (img, alpha) => {
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
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

    ctx.globalAlpha = alpha;
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.globalAlpha = 1;
  };

  /**
   * Dibuja el estado actual de la secuencia fundiendo los dos fotogramas contiguos
   * según la parte decimal del progreso. Es lo que convierte 80 saltos discretos
   * en un recorrido continuo.
   */
  const render = () => {
    const exact = currentProgress * (FRAME_COUNT - 1);
    const lowIndex = Math.floor(exact);
    const highIndex = Math.min(FRAME_COUNT - 1, lowIndex + 1);
    const blend = exact - lowIndex;

    const lowFrame = resolveFrame(lowIndex);
    if (!lowFrame) {
      // El contexto es opaco: sin fotograma se pinta el color de papel en vez de negro.
      ctx.fillStyle = '#f4f0e7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    paint(lowFrame, 1);

    if (blend > 0.001 && highIndex !== lowIndex) {
      const highFrame = images[highIndex];
      if (highFrame) paint(highFrame, blend);
    }
  };

  /**
   * Bucle de animación: acerca el progreso mostrado al progreso real del scroll
   * con una interpolación independiente de la tasa de refresco, y se detiene solo
   * cuando ambos coinciden para no consumir CPU en reposo.
   * @param {number} now - Marca de tiempo aportada por requestAnimationFrame.
   */
  const tick = (now) => {
    const delta = lastFrameTime ? Math.min(now - lastFrameTime, 100) : 16.7;
    lastFrameTime = now;

    // Suavizado exponencial normalizado a 60 fps para que se sienta igual a 60, 120 o 144 Hz.
    const factor = 1 - Math.pow(1 - SCROLL_EASE, delta / (1000 / 60));
    currentProgress += (targetProgress - currentProgress) * factor;

    if (Math.abs(targetProgress - currentProgress) < SETTLE_EPSILON) {
      currentProgress = targetProgress;
      isAnimating = false;
      lastFrameTime = 0;
      render();
      return;
    }

    render();
    requestAnimationFrame(tick);
  };

  /**
   * Arranca el bucle de animación si no estaba ya en marcha.
   */
  const requestRender = () => {
    if (prefersReducedMotion) {
      render();
      return;
    }
    if (isAnimating) return;
    isAnimating = true;
    lastFrameTime = 0;
    requestAnimationFrame(tick);
  };

  /**
   * Recalcula el progreso objetivo a partir de la posición de scroll.
   */
  const updateTargetProgress = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    targetProgress = Math.max(0, Math.min(1, scrollTop / metrics.scrollableDistance));

    if (prefersReducedMotion) {
      currentProgress = targetProgress;
      render();
      return;
    }
    requestRender();
  };

  /**
   * Revela las tarjetas magazine una a una conforme entran en pantalla.
   * Usa IntersectionObserver en lugar de medir cada tarjeta en cada evento de scroll.
   */
  const initMagazineCards = () => {
    const cards = document.querySelectorAll('.magazine-spec-card');
    if (cards.length === 0) return;

    if (prefersReducedMotion) {
      cards.forEach((card) => card.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, {
      // Equivale a la antigua línea de disparo al 82% de la altura del viewport.
      rootMargin: '0px 0px -18% 0px',
      threshold: 0
    });

    cards.forEach((card) => observer.observe(card));
  };

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeCanvas();
      updateTargetProgress();
    }, 150);
  };

  // Event Listeners
  window.addEventListener('scroll', updateTargetProgress, { passive: true });
  window.addEventListener('resize', onResize);

  // El alto del documento cambia al cargar fuentes e imágenes de la galería.
  if ('ResizeObserver' in window) {
    const bodyObserver = new ResizeObserver(() => {
      measure();
      updateTargetProgress();
    });
    bodyObserver.observe(document.body);
  }

  // Inicialización
  resizeCanvas();
  updateTargetProgress();
  initMagazineCards();
  preloadImages();
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
      siblingChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });

      // Activar chip seleccionado
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');

      // Actualizar objeto de configuración y resumen
      currentConfig[group] = value;
      updateSummary();

      // Una nueva configuración invalida la confirmación anterior.
      if (successMsg) successMsg.classList.remove('visible');
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
 * Menú de navegación para pantallas pequeñas, donde la barra superior no cabe.
 */
const initMobileNavigation = () => {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-locked', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Cerrar al elegir destino o al pulsar Escape.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
};

/**
 * Manejador principal al cargar el DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
  initFullPageSequenceController();
  initOrderFormHandler();
  initScrollRevealController();
  initMobileNavigation();
});
