/* =========================================================
   Angelos Barmpoutis — site script
   Vanilla JS, no build step, GitHub Pages friendly.
   ========================================================= */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     Theme toggle (light / dark)
     The initial theme is set synchronously in a small inline
     script in <head> to avoid a flash of the wrong theme; this
     block just wires up the button's interaction and keeps its
     accessible state in sync.
  --------------------------------------------------------- */
  const themeToggle = document.getElementById("themeToggle");
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function syncThemeToggleUI() {
    if (!themeToggle) return;
    const theme = currentTheme();
    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    themeToggle.setAttribute("aria-label", theme === "light" ? "Switch to dark theme" : "Switch to light theme");
  }
  syncThemeToggleUI();
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = currentTheme() === "light" ? "dark" : "light";
      if (next === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      try { localStorage.setItem("theme", next); } catch (e) { /* private browsing / storage disabled */ }
      syncThemeToggleUI();
    });
  }

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Mobile nav toggle
  --------------------------------------------------------- */
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      navToggle.setAttribute("aria-label", expanded ? "Open navigation menu" : "Close navigation menu");
      mobileNav.hidden = expanded;
    });
    // close mobile nav after choosing a link
    mobileNav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open navigation menu");
        mobileNav.hidden = true;
      });
    });
  }

  /* ---------------------------------------------------------
     Scroll progress rail (decorative)
  --------------------------------------------------------- */
  const scanFill = document.getElementById("scanFill");
  function updateScanRail() {
    if (!scanFill) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
    scanFill.style.height = (pct * 100) + "%";
  }
  document.addEventListener("scroll", updateScanRail, { passive: true });
  updateScanRail();

  /* ---------------------------------------------------------
     Scroll-reveal for sections (respects reduced motion)
  --------------------------------------------------------- */
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const revealables = document.querySelectorAll(".research-card, .project-card, .funding-item, .timeline-item, .repo-card");
    revealables.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealables.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------
     Animated stat counters
  --------------------------------------------------------- */
  function animateCounters() {
    const counters = document.querySelectorAll(".counter");
    counters.forEach((el) => {
      const target = parseFloat(el.getAttribute("data-target"));
      const decimals = parseInt(el.getAttribute("data-decimal") || "0", 10);
      if (prefersReducedMotion) {
        el.textContent = target.toFixed(decimals);
        return;
      }
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = val.toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  const heroStats = document.querySelector(".hero__stats");
  if (heroStats) {
    if ("IntersectionObserver" in window) {
      const statsIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounters();
            statsIO.disconnect();
          }
        });
      }, { threshold: 0.4 });
      statsIO.observe(heroStats);
    } else {
      animateCounters();
    }
  }

  /* ---------------------------------------------------------
     HERO CANVAS — digitization / point-cloud scan animation
     A field of points forming a loose "inscribed tablet" grid,
     drifting gently with a sweeping scan-line highlight and
     subtle mouse parallax. Static single frame if the user
     prefers reduced motion.
  --------------------------------------------------------- */
  const canvas = document.getElementById("heroCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    let points = [];
    let mouseX = 0.5, mouseY = 0.5;
    let scanY = 0;
    let rafId = null;

    const ACCENT_SCAN = [95, 225, 201];
    const ACCENT_BRONZE = [200, 135, 74];
    const STONE = [203, 185, 156];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildPoints();
    }

    function buildPoints() {
      points = [];
      // Structured "tablet" grid — evokes a scanned inscription slab
      const cols = 26;
      const rows = 16;
      const tabletW = Math.min(w * 0.62, 640);
      const tabletH = tabletW * 0.62;
      const originX = w * 0.66 - tabletW / 2;
      const originY = h * 0.48 - tabletH / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // skip some points randomly to feel like a worn/eroded inscription
          if (Math.random() < 0.14) continue;
          const gx = originX + (c / (cols - 1)) * tabletW;
          const gy = originY + (r / (rows - 1)) * tabletH;
          points.push({
            baseX: gx,
            baseY: gy,
            x: gx,
            y: gy,
            phase: Math.random() * Math.PI * 2,
            speed: 0.4 + Math.random() * 0.6,
            amp: 2 + Math.random() * 3,
            r: 1 + Math.random() * 1.4,
            depth: 0.4 + Math.random() * 0.6, // for parallax strength
            colorMix: Math.random()
          });
        }
      }
      // ambient scattered particles (the surrounding "point cloud")
      const ambientCount = Math.round((w * h) / 9000);
      for (let i = 0; i < ambientCount; i++) {
        points.push({
          baseX: Math.random() * w,
          baseY: Math.random() * h,
          x: 0, y: 0,
          phase: Math.random() * Math.PI * 2,
          speed: 0.15 + Math.random() * 0.3,
          amp: 6 + Math.random() * 10,
          r: 0.6 + Math.random() * 1,
          depth: 0.1 + Math.random() * 0.3,
          colorMix: Math.random(),
          ambient: true
        });
      }
    }

    function mixColor(mix) {
      const from = mix < 0.5 ? STONE : ACCENT_SCAN;
      const to = mix < 0.5 ? ACCENT_SCAN : ACCENT_BRONZE;
      const t = mix < 0.5 ? mix * 2 : (mix - 0.5) * 2;
      const r = Math.round(from[0] + (to[0] - from[0]) * t * 0.3);
      const g = Math.round(from[1] + (to[1] - from[1]) * t * 0.3);
      const b = Math.round(from[2] + (to[2] - from[2]) * t * 0.3);
      return [r, g, b];
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const px = (mouseX - 0.5) * 18;
      const py = (mouseY - 0.5) * 12;

      scanY = (scanY + 0.6) % (h + 200);

      for (const p of points) {
        const wobble = Math.sin(t * 0.001 * p.speed + p.phase) * p.amp;
        const parX = px * p.depth;
        const parY = py * p.depth;
        p.x = p.baseX + wobble * 0.4 + parX;
        p.y = p.baseY + wobble + parY;

        const distToScan = Math.abs(p.y - (scanY - 100));
        const scanBoost = Math.max(0, 1 - distToScan / 90);

        const [r, g, b] = mixColor(p.colorMix);
        const baseAlpha = p.ambient ? 0.18 : 0.55;
        const alpha = Math.min(1, baseAlpha + scanBoost * 0.6);
        const radius = p.r + scanBoost * 1.6;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // faint scan-line sweep
      const grad = ctx.createLinearGradient(0, scanY - 110, 0, scanY + 110);
      grad.addColorStop(0, "rgba(95,225,201,0)");
      grad.addColorStop(0.5, "rgba(95,225,201,0.05)");
      grad.addColorStop(1, "rgba(95,225,201,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 110, w, 220);

      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      for (const p of points) {
        const [r, g, b] = mixColor(p.colorMix);
        const alpha = p.ambient ? 0.16 : 0.5;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.arc(p.baseX, p.baseY, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    window.addEventListener("resize", () => {
      resize();
      if (prefersReducedMotion) drawStatic();
    });

    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX / window.innerWidth;
      mouseY = e.clientY / window.innerHeight;
    }, { passive: true });

    resize();
    if (prefersReducedMotion) {
      drawStatic();
    } else {
      rafId = requestAnimationFrame(draw);
    }
  }

  /* ---------------------------------------------------------
     INCREMENTAL "SHOW MORE" RENDERER
     Generic helper used by Publications, News, Awards, and
     Funding: renders the first `batchSize` items, then reveals
     more items in batches as the person clicks "Show more".
  --------------------------------------------------------- */
  function createIncrementalRenderer({ listEl, moreWrapEl, renderItem, batchSize, noun }) {
    let items = [];
    let shown = 0;
    let renderedNodes = [];

    function renderButton(focusIt) {
      moreWrapEl.innerHTML = "";
      const remaining = items.length - shown;
      if (remaining > 0) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--ghost show-more-btn";
        const nextCount = Math.min(batchSize, remaining);
        btn.textContent = `Show ${nextCount} more (${remaining} remaining)`;
        btn.addEventListener("click", () => renderBatch(true));
        moreWrapEl.appendChild(btn);
        if (focusIt) btn.focus({ preventScroll: true });
      } else if (focusIt && items.length > batchSize) {
        // announce completion to keyboard/screen-reader users without
        // yanking focus somewhere unexpected
        const done = document.createElement("p");
        done.setAttribute("role", "status");
        done.className = "visually-hidden";
        done.textContent = `All ${items.length} ${noun} shown.`;
        moreWrapEl.appendChild(done);
      }
    }

    function renderBatch(focusButtonAfter) {
      const nextCount = Math.min(batchSize, items.length - shown);
      if (nextCount <= 0) {
        renderButton(focusButtonAfter);
        return;
      }

      for (let i = shown; i < shown + nextCount; i++) {
        if (renderedNodes[i]) {
          renderedNodes[i].style.display = "";
        }
      }

      shown += nextCount;
      renderButton(focusButtonAfter);
    }

    return {
      setItems(newItems) {
        items = newItems;
        shown = 0;
        renderedNodes = [];
        listEl.innerHTML = "";

        const frag = document.createDocumentFragment();
        items.forEach((item, index) => {
          const el = renderItem(item);
          renderedNodes.push(el);
          el.style.display = index < batchSize ? "" : "none";
          frag.appendChild(el);
        });

        listEl.appendChild(frag);
        shown = Math.min(batchSize, items.length);
        renderButton(false);
      }
    };
  }

  /* ---------------------------------------------------------
     RESEARCH AREAS DATA + RENDER
  --------------------------------------------------------- */
  const researchAreas = [
    {
      title: "Embodied & Immersive Interaction",
      icon: "vr",
      summary: "Design of passive haptic interfaces, immersive museum installations, and embodied interactions in virtual environments.",
      detail: "Foundational contributions include a patented real-time human-body reconstruction and avatar synthesis system (U.S. Patent 10,121,273 B2) built on low-cost infrared depth sensors.",
      link: { href: "https://patents.google.com/patent/US10121273B2/", label: "View the patent" }
    },

    {
      title: "Computational Creativity & AI",
      icon: "spark",
      summary: "Computational systems as creative collaborators — from AI-driven dance analysis to generative performance tools.",
      detail: "Representative work: real-time recognition and attribution of Afrogenic dance movements (ACM IMX 2026), developed with the ATUNDA project and funded by the Robert Wood Johnson Foundation, connecting computational motion analysis with performance studies.",
      link: { href: "https://dl.acm.org/doi/10.1145/3788851.3805020", label: "Read the ACM IMX paper" }
    },
    
    {
      title: "Emerging Techologies for Social Impact",
      icon: "cube",
      summary: "Projects span passive-haptic VR for music conductor education, museum collections situated in 3D context for children, and integrated telehealth and XR for post-surgical home exercise adherence.",
      detail: "Notable work includes designing and deploying a web platform through an NIH-supported commercialization effort that led to a university spin-out start-up company, which gained FDA approval as a Class II medical device and is now being used in all major hospitals.",
      link: { href: "https://doi.org/10.1109/KELVAR.2016.7563674", label: "Read the IEEE VR paper" }
    },
    {
      title: "Digital Heritage & Public Experience",
      icon: "column",
      summary: "Development of novel methods for 3D digitization and analysis of historical artifacts, transforming how we preserve and share cultural monuments.",
      detail: "Work includes the 3D digitization of the Rosetta Stone for the British Museum, and the Digital Epigraphy Toolbox — an NEH-funded, internationally adopted tool used by the Library of Congress, Cornell University, and the UK National Archives.",
      link: { href: "https://www.digitalepigraphy.org/", label: "Visit the Digital Epigraphy Project" }
    },
    /*{
      title: "Human Movement & Motion Analysis",
      icon: "figure",
      summary: "AI-driven classification of human motion, from Laban dance movement encoding to driver body posture analysis.",
      detail: "Includes AI-driven human motion classification using the Laban Movement System and the real-time body posture detection for kinesthetic gaming applications as a culturally responsive teaching methodology.",
      link: { href: "https://doi.org/10.1109/KELVAR.2016.7563674", label: "Read the IEEE VR paper" }
    },
    {
      title: "Start-up Development",
      icon: "pulse",
      summary: "Led the commercialization of a university research project into a spin-out SAAS (Software as a Service) company.",
      detail: "I designed and deployed a web platform through an NIH-supported commercialization effort that led to the university spin-out start-up company Neuropacs, which gained FDA approval as a Class II medical device and is now being used in all major hospitals.",
      link: { href: "https://neuropacs.com", label: "Visit the neuropacs website" }
    }*/
  ];

  const ICONS = {
    spark: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><path d="M13 2l2.4 7.6L23 12l-7.6 2.4L13 22l-2.4-7.6L3 12l7.6-2.4L13 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    cube: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><path d="M13 2 23 7.5v11L13 24 3 18.5v-11L13 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 7.5 13 13l10-5.5M13 13v11" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    vr: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><rect x="2" y="8" width="22" height="11" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="13.5" r="2.3" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="13.5" r="2.3" stroke="currentColor" stroke-width="1.6"/><path d="M2 12.5v2M24 12.5v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    layers: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><path d="M13 3 24 9l-11 6L2 9l11-6z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 14l11 6 11-6M2 19l11 6 11-6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    figure: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="5" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M13 9v7m0 0-5 8m5-8 5 8M7 14l6 2 6-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    column: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><path d="M4 6h18M6 6v14m14-14v14M4 22h18M9 9v9m4-9v9m4-9v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    pulse: '<svg width="78" height="78" viewBox="0 0 26 26" fill="none"><path d="M2 13h5l2.5-8L14 21l2.5-8H24" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>'
  };

  function renderResearchGrid() {
    const grid = document.getElementById("researchGrid");
    if (!grid) return;
    const frag = document.createDocumentFragment();
    researchAreas.forEach((area, i) => {
      const details = document.createElement("details");
      details.className = "research-card";
      const panelId = "research-panel-" + i;
      details.innerHTML = `
        <summary class="research-card__head" aria-controls="${panelId}">
          <span class="research-card__head-top">
            <span class="research-card__icon" aria-hidden="true">${ICONS[area.icon]}</span>
            <span class="research-card__chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </span>
          <span class="research-card__title">${area.title}</span>
        </summary>
        <p class="research-card__summary">${area.summary}</p>
        <div class="research-card__panel-inner" id="${panelId}">
          <p>${area.detail}</p>
          ${area.link ? `<p style="margin-top:0.75rem;"><a href="${area.link.href}">${area.link.label} &rarr;</a></p>` : ""}
        </div>
      `;
      frag.appendChild(details);
    });
    grid.appendChild(frag);
  }
  renderResearchGrid();

  /* ---------------------------------------------------------
     STUDENT WORK LIGHTBOX
  --------------------------------------------------------- */
  const lightbox = document.getElementById("studentWorkLightbox");
  const lightboxImage = document.getElementById("studentWorkLightboxImage");
  const lightboxCaption = document.getElementById("studentWorkLightboxCaption");
  const lightboxClose = document.getElementById("studentWorkLightboxClose");

  function closeStudentWorkLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    if (lightboxClose) lightboxClose.blur();
  }

  if (lightbox && lightboxImage && lightboxCaption && lightboxClose) {
    const triggers = document.querySelectorAll(".student-work__trigger");
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const src = trigger.getAttribute("data-full") || trigger.querySelector("img")?.getAttribute("src");
        const caption = trigger.getAttribute("data-caption") || "";
        lightboxImage.src = src;
        lightboxImage.alt = trigger.querySelector("img")?.getAttribute("alt") || "Student work image";
        lightboxCaption.textContent = caption;
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");
      });
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeStudentWorkLightbox();
    });

    lightboxClose.addEventListener("click", closeStudentWorkLightbox);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
        closeStudentWorkLightbox();
      }
    });
  }

  /* ---------------------------------------------------------
     FEATURED PROJECTS DATA + RENDER
  --------------------------------------------------------- */
  const projects = [
     {
      tag: "Telehealth XR",
      title: "XR for Home Exercise After Joint Replacement",
      desc: "Integrated telehealth and extended reality to enhance home exercise adherence following total hip and knee arthroplasty.",
      img: "assets/conroy2025integrated.jpg",
      href: "https://doi.org/10.1109/VRW66409.2025.00195"
    },
    {
      tag: "AI + Dance",
      title: "Real-Time Afrogenic Dance Move Recognition",
      desc: "AI-driven recognition and attribution of Afrogenic dance movements, presented at ACM IMX 2026 and funded by the Robert Wood Johnson Foundation.",
      img: "assets/pank2026real.jpg",
      href: "https://dl.acm.org/doi/10.1145/3788851.3805020"
    },
     {
      tag: "3D Digitization",
      title: "3D Digitization of the Rosetta Stone",
      desc: "3D scanning and reconstruction of the Rosetta Stone for the British Museum, part of the long-running Digital Epigraphy and Archaeology initiative.",
      img: "assets/amin2023digital.jpg",
      href: "https://www.digitalepigraphy.org/page/3d-scanning-the-rosetta-stone/"
    },

    {
      tag: "VR for Museums",
      title: "Enhancing Museum Experience with VR",
      desc: "Situating 3D museum collections in context to deepen learning and engagement for young visitors.",
      img: "assets/delgado2024enhancing.jpg",
      href: "https://doi.org/10.1145/3628516.3659372"
    },

    {
      tag: "Digital Heritage",
      title: "Digital Epigraphy Toolbox",
      desc: "An NEH-funded, internationally adopted toolbox for 3D digitization, UV-map estimation, and analysis of ancient inscriptions.",
      img: "assets/barmpoutis2013digital.jpg",
      href: "https://www.digitalepigraphy.org/"
    },

    {
      tag: "Passive Haptics",
      title: "Passive Haptics &amp; Physical Object Interaction in VR",
      desc: "Studying how interacting with physical objects inside virtual environments affects knowledge acquisition, recall, and perception.",
      img: "assets/barmpoutis2020virtual.jpg",
      href: "https://doi.org/10.1007/978-3-030-50729-9_20"
    },
    
    {
      tag: "Patented Inventions",
      title: "Tensor Body — Real-Time Avatar Synthesis",
      desc: "Real-time reconstruction of the human body and automated avatar synthesis from low-cost depth sensors — U.S. Patent 10,121,273 B2.",
      img: "assets/barmpoutis2018real.png",
      href: "https://patents.google.com/patent/US10121273B2/en"
    },
    {
      tag: "Start-up Development",
      title: "Commercializing University Research",
      desc: "Led the commercialization of a university research project into a spin-out SAAS (Software as a Service) company, which gained FDA-approval as a Class II medical device.",
      img: "assets/tractography.png",
      href: "https://neuropacs.com"
    },
    {
      tag: "Education & Games",
      title: "Saving Lives With Coding",
      desc: "The global impact of an undergraduate coding project built with the UF Literacy Institute, used more than 150,000 times per day across 27 states.",
      img: "assets/barmpoutis2024saving.png",
      href: "https://doi.org/10.33424/FUTURUM547"
    }
  ];

  function renderProjects() {
    const grid = document.getElementById("projectGrid");
    if (!grid) return;
    const frag = document.createDocumentFragment();
    projects.forEach((p) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.className = "project-card";
      a.href = p.href;
      a.innerHTML = `
        <span class="project-card__media">
          <img src="${p.img}" alt="" loading="lazy" width="450" height="338">
          <span class="project-card__tag">${p.tag}</span>
        </span>
        <span class="project-card__body">
          <span class="project-card__title">${p.title}</span>
          <span class="project-card__desc">${p.desc}</span>
          <span class="project-card__link">View project
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10l8-8M4 2h6v6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </span>
      `;
      li.appendChild(a);
      frag.appendChild(li);
    });
    grid.appendChild(frag);
  }
  renderProjects();

  /* ---------------------------------------------------------
     FUNDING + TIMELINE DATA/RENDER
  --------------------------------------------------------- */
  const fundingHighlights = [
    { amount: "$439,336", title: "ATUNDA: An AI Deep Tech Solution for Afrogenic Dance Move Recognition", meta: "Robert Wood Johnson Foundation 79829 · co-Director · July 2023 – June 2024" },
    { amount: "$1,647,650", title: "Clinical performance testing of neuropacs™ in Parkinsonism diagnosis", meta: "NIH NIA/NINDS 2R42NS132614-02 · PI · Sept 2024 – Aug 2026" },
    { amount: "$392,605", title: "Collaborative Research: 3D Visualization of Dentofacial Development in Primates", meta: "NSF 2235578 · Senior Faculty · May 2023 – Apr 2026" },
    { amount: "$400,000", title: "Intersections on Technology, Space, and Time", meta: "Andrew W. Mellon Foundation · co-Investigator · Aug 2018 – Aug 2021" },
    { amount: "$87,000", title: "K3D: An Augmented-Reality Distance Education Classroom", meta: "UF Office of the CIO · PI · May 2012 – May 2013" },
    { amount: "$48,943", title: "Novel framework for physical tele-therapy using infrared depth sensors and haptic feedback", meta: "UF Informatics Institute Seed Fund · PI · Sept 2014 – Sept 2015" },
    { amount: "$50,000", title: "AI-driven Movement Classification and Analysis across Clinical and Cultural Application Areas", meta: "UF AI Catalyst Fund · PI · Jan – Dec 2021" },
    { amount: "$20,000", title: "Development of interactive 3D multimedia visualization", meta: "Intel, Inc. (corporate gift) · Dec 2015 – May 2016" },
    { amount: "$16,500", title: "Consumer Video Product for the Monster Jam Ride Truck", meta: "FELD Entertainment · PI · Aug 2019 – Aug 2020" },
    { amount: "$16,500", title: "Virtual Reality: A Next-Generation Tool to Improve Waste and Materials Management", meta: "PTP Strategies, LLC · PI · Aug 2019 – Aug 2020" },
    { amount: "$7,500", title: "Game technology to enhance sensory input and promote walking recovery", meta: "UF CTSI / NIH · co-Investigator · Mar 2011 – Mar 2012" },
    { amount: "$4,777,251", title: "Web-based Automated Imaging Differentiation of Parkinsonism", meta: "NIH U01 NS119562-01 · Multi-PI · Apr 2021 – Mar 2026" },
    { amount: "$132,972", title: "Investigating the Effect of Drivers' Body Motion on Traffic Safety", meta: "US DOT / STRIDE 2013-051S · PI · Sept 2013 – June 2015" },
    { amount: "$421,788", title: "Dysmetria & Motor Function in SCA: Mechanisms and Rehabilitation", meta: "NIH-NINDS R21 NS094946 · Investigator · Sept 2015 – Aug 2018" },
    { amount: "$70,000", title: "3D Digitization of the Squeeze Collection, University of Venice", meta: "Ca' Foscari University of Venice (Digital Epigraphy Toolbox) · Consultant · June 2017 – May 2019" },
    { amount: "$53,500", title: "E-STAMPAGES", meta: "French Ministry of Higher Education, BSN5 2014 · Consultant · Jan 2015 – June 2016" },
    { amount: "$50,000", title: "Digital Epigraphy Toolbox", meta: "National Endowment for the Humanities, HD-51214-11 · Project Director · June 2011 – Dec 2012" },
    { amount: "$16,500", title: "CDD-SORT: ML System to Detect Recyclable/Problematic Materials in Construction Debris", meta: "PTP Strategies / EPA SBIR · Faculty coach/consultant · Aug 2018 – Aug 2019" },
    { amount: "$16,500", title: "Central Office Visually Enhanced Asset Tracking and Management System", meta: "Verizon, Inc. · PI · Aug 2017 – Aug 2018" }
    ];

  const awardsTimeline = [
    { year: "2026", title: "Provost's Commendation for Outstanding Teaching Evaluations" },
    { year: "2025", title: "Recipient of the Innov8r license plate at the third annual Standing InnOvation Showcase." },
    { year: "2024", title: "Sigma Xi — Scientific Research Honor Society, Elected Full Member" },
    { year: "2024", title: "Presidential Appointee, University Taskforce" },
    { year: "2020–2023", title: "UF Research Foundation Professor" },
    { year: "2023", title: "Best Paper Award — 2nd place, IEEE ISEC" },
    { year: "2022", title: "Faculty speaker at the College of the Arts Graduation Ceremony." },
    { year: "2021", title: "Awarded Sabbatical Leave (Spring and Fall)" },
    { year: "2019", title: "Anderson Scholar Faculty Honoree" },
    { year: "2017", title: "Undergraduate Teacher of the Year Award, College of the Arts, UF" },
    { year: "2016", title: "Finalist, Rome Prize — Historic Preservation and Conservation, American Academy in Rome" },
    { year: "2014", title: "Merit Award &amp; Best Paper Award Finalist, IEEE ICCVE Conference" },
    { year: "2012", title: "e-Humanities Award, 2nd place, University of Leipzig" },
    { year: "2008", title: "Outstanding Academic Achievement Award, University of Florida" },
    { year: "2008", title: "MICCAI Young Scientist Award Finalist" },
    { year: "2007", title: "First author of the most-cited article in Information Processing in Medical Imaging (Scopus)" },
    { year: "2007", title: "Bursary, International Epigraphic Conference, University of Oxford" },
    { year: "2004–2008", title: "Alumni Fellowship, University of Florida" }
  ];

  /* ---------------------------------------------------------
     NEWS DATA
     Press and media coverage. Years reflect the approximate
     publication date of each feature.
  --------------------------------------------------------- */
  const newsItems = [
    {
      year: "October 2026",
      title: "Our team will present the panel: Artists as Architects of Future Tech: A Look at the Interdisciplinary Atunda Project.",
      source: "2026 a2ru Conference: \"How We Thrive: Arts, Health and Human Flourishing\"",
      href: "https://a2ru.org/event/2026-a2ru-conference-how-we-thrive-arts-health-and-human-flourishing/"
    },
    {
      year: "August 2026",
      title: "Congratulations to my students from the Master in Digital Arts and Sciences program for presenting their research on HCII 2026.",
      source: "International Conference on Human-Computer Interaction (HCII 2026)",
      href: "https://doi.org/10.1007/978-3-032-30816-0_11"  
    },
    {
      year: "July 2026",
      title: "Honored to have contributed to a new edited volume published today by Oxford University Press on Digital Classical Studies.",
      source: "Oxford University Press",
      href: "https://doi.org/10.1093/9780197835210.003.0032"  
    },
     {
      year: "June 2026",
      title: "Congratulations to my students T.Pank and D.Carrascosa for presenting our research at ACM IMX.",
      source: "ACM Conference on Interactive Media Experiences 2026",
      href: "https://doi.org/10.1145/3788851.3805020"  
    },
    {
      year: "April 2026",
      title: "Prof. Barmpoutis presented the keynote speech on technology transfer and entrepreneurship at the Nucleate Florida’s AI in Biotech event.",
      source: "Nucleate.org",
      href: "https://nucleate.org/"
    },
    {
      year: "March 2026",
      title: "Prof. Barmpoutis delivered an invited lecture at the University of Chicago.",
      source: "University of Chicago",
      href: "https://www.uchicago.edu/"
    },
    {
      year: "October 2025",
      title: "Prof. Barmpoutis was  honored at the third annual #InnOvationShowcase2025 with the license plate INNOV8R, which is given to UF researchers whose disclosed inventions have been officially licensed by a company. ",
      source: "UF Center for the Arts, Migration, and Enterpreneurship",
      href: "https://www.instagram.com/p/DQwovkaj3ca/"
    },
    {
      year: "April 2025",
      title: "Prof. Barmpoutis delivered the keynote speech at the 26th Undergraduate Research Symposium at the Stephen O'connell Center.",
      source: "Center for Undergraduate Research",
      href: "https://cur.aa.ufl.edu/wp-content/uploads/2025/04/Spring_symposium_2025.pdf"
    
    },
    {
      year: "March 2025",
      title: "Prof. Barmpoutis and Qudus Onikeku were interviewed for a Medium article on the Atunda dance move project.",
      source: "Medium",
      href: "https://medium.com/whats-next-health/5-questions-for-qudus-onikeku-and-angelos-barmpoutis-7988e3beaeb8/"
    },
    {
      year: "February 2024",
      title: "Prof. Barmpoutis deliverd an invited lecture on 'Investigating human behavior using passive haptics & motion tracking in extended reality environments' at the department of Applied Physiology and Kinesiology.",
      source: "College of Health and Human Performance",
      href: "https://hhp.ufl.edu/"
    }
  ];

  function renderNewsItem(n) {
    const li = document.createElement("li");
    li.className = "news-item";
    li.innerHTML = `
      <div class="news-item__year">${n.year}</div>
      <div class="news-item__title"><a href="${n.href}">${n.title}</a></div>
      <div class="news-item__source">${n.source}</div>
    `;
    return li;
  }

  function initNews() {
    const listEl = document.getElementById("newsList");
    const moreWrapEl = document.getElementById("newsShowMore");
    if (!listEl || !moreWrapEl) return;
    const renderer = createIncrementalRenderer({
      listEl,
      moreWrapEl,
      renderItem: renderNewsItem,
      batchSize: 10,
      noun: "news items"
    });
    renderer.setItems(newsItems);
  }
  initNews();

  function renderFundingItem(f) {
    const li = document.createElement("li");
    li.className = "funding-item";
    li.innerHTML = `
      <div class="funding-item__amount">${f.amount}</div>
      <div class="funding-item__title">${f.title}</div>
      <div class="funding-item__meta">${f.meta}</div>
    `;
    return li;
  }

  function initFunding() {
    const listEl = document.getElementById("fundingList");
    const moreWrapEl = document.getElementById("fundingShowMore");
    if (!listEl || !moreWrapEl) return;
    const renderer = createIncrementalRenderer({
      listEl,
      moreWrapEl,
      renderItem: renderFundingItem,
      batchSize: 6,
      noun: "funded projects"
    });
    renderer.setItems(fundingHighlights);
  }
  initFunding();

  function renderTimelineItem(a) {
    const li = document.createElement("li");
    li.className = "timeline-item";
    li.innerHTML = `
      <div class="timeline-item__year">${a.year}</div>
      <div class="timeline-item__title">${a.title}</div>
    `;
    return li;
  }

  function initTimeline() {
    const listEl = document.getElementById("timelineList");
    const moreWrapEl = document.getElementById("timelineShowMore");
    if (!listEl || !moreWrapEl) return;
    const renderer = createIncrementalRenderer({
      listEl,
      moreWrapEl,
      renderItem: renderTimelineItem,
      batchSize: 10,
      noun: "awards"
    });
    renderer.setItems(awardsTimeline);
  }
  initTimeline();

  /* ---------------------------------------------------------
     OPEN SOURCE / REPO DATA + RENDER
  --------------------------------------------------------- */
  const repos = [
    {
      title: "J4Q — Java for Meta Quest",
      desc: "Android Studio framework enabling Java development for Meta Quest headsets. Award-winning at IEEE ISEC.",
      href: "https://github.com/digitalworlds/JavaForQuest",
      linkLabel: "github.com/digitalworlds/JavaForQuest"
    },
    {
      title: "Android For Beginners",
      desc: "Instructional Android Studio apps for mobile and wearable development, used in undergraduate coursework.",
      href: "https://github.com/digitalworlds/AndroidForBeginners",
      linkLabel: "github.com/digitalworlds/AndroidForBeginners"
    },
    {
      title: "UPose",
      desc: "Unity 3D framework for live avatar animation using the MediaPipe body-tracking stream.",
      href: "https://github.com/digitalworlds/UPose",
      linkLabel: "View project"
    },
    {
      title: "Digital Epigraphy Toolbox",
      desc: "3D online tool for UV-map reconstruction and analysis of ancient inscriptions. NEH-funded; adopted by the Library of Congress, Cornell, and UK National Archives.",
      href: "https://www.digitalepigraphy.org",
      linkLabel: "digitalepigraphy.org"
    },
    {
      title: "J4K — Java for Kinect",
      desc: "Widely adopted open-source library for Kinect development, in continuous use since 2013 in 50+ countries — including Institut Pasteur (ICY) and UFPE Brazil (MARINE).",
      href: "https://abarmpou.github.io/ufdw/j4k/",
      linkLabel: "View project"
    },
    {
      title: "AIDP Diagnostic Platform",
      desc: "I designed a cloud-based web application for automated imaging differentiation of Parkinsonian variants, classified by FDA as a Class II medical device for clinical use.",
      href: "https://neuropacs.com",
      linkLabel: "View project"
    }
  ];

  function renderRepos() {
    const grid = document.getElementById("repoGrid");
    if (!grid) return;
    const frag = document.createDocumentFragment();
    repos.forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <a class="repo-card" href="${r.href}">
          <span class="repo-card__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 8h18" stroke="currentColor" stroke-width="1.5"/></svg>
          </span>
          <span class="repo-card__title">${r.title}</span>
          <span class="repo-card__desc">${r.desc}</span>
          <span class="repo-card__link">${r.linkLabel} &rarr;</span>
        </a>
      `;
      frag.appendChild(li);
    });
    grid.appendChild(frag);
  }
  renderRepos();

  /* ---------------------------------------------------------
     PUBLICATIONS — data loading, filter, sort, render
  --------------------------------------------------------- */
  const pubListEl = document.getElementById("pubList");
  const pubCountEl = document.getElementById("pubCount");
  const pubEmptyEl = document.getElementById("pubEmpty");
  const pubSearchEl = document.getElementById("pubSearch");
  const pubSortEl = document.getElementById("pubSort");
  const pubResetBtn = document.getElementById("pubReset");
  const filterChips = document.querySelectorAll("[data-filter-type]");

  let allPublications = [];
  let citationsData = {};
  let state = { query: "", type: "all", sort: "feature-desc" };

  function classifyType(entry) {
    if (entry.journal) return "Journal Article";
    if (entry.booktitle) {
      const bt = entry.booktitle.toLowerCase();
      const org = (entry.organization || "").toLowerCase();
      if (org || /conference|proceedings|workshop|meeting|symposium|congress|international/.test(bt)) {
        return "Conference Paper";
      }
      return "Book Chapter";
    }
    return "Other";
  }

  function formatAuthors(authorStr) {
    if (!authorStr) return "";
    const parts = authorStr.split(/\s+and\s+/i);
    const shown = parts.slice(0, 8);
    let html = shown
      .map((name) => {
        const isHim = /barmpoutis/i.test(name);
        const clean = name.trim().replace(/,\s*$/, "");
        return isHim ? `<strong>${clean}</strong>` : clean;
      })
      .join(", ");
    if (parts.length > shown.length) html += ", et al.";
    return html;
  }

  function formatVenue(entry) {
    const bits = [];
    if (entry.journal) {
      bits.push(entry.journal);
      if (entry.volume) bits.push(`vol. ${entry.volume}${entry.number ? `(${entry.number})` : ""}`);
    } else if (entry.booktitle) {
      bits.push(entry.booktitle);
    }
    if (entry.pages) bits.push(`pp. ${entry.pages}`);
    if (entry.publisher) bits.push(entry.publisher);
    return bits.join(" &middot; ");
  }

  function pubLink(entry) {
    return entry.doi || entry.url || null;
  }

  /* ---------------------------------------------------------
     BibTeX generation — built from the same fields already in
     publications.json, so no separate bibtex field is needed.
  --------------------------------------------------------- */
  function generateBibtex(entry, key, type) {
    const bibType = entry.journal
      ? "article"
      : entry.booktitle
        ? (type === "Book Chapter" ? "incollection" : "inproceedings")
        : "misc";

    const fields = [];
    const add = (name, val) => { if (val) fields.push(`  ${name} = {${val}}`); };

    add("author", entry.author);
    add("title", entry.title);
    if (bibType === "article") {
      add("journal", entry.journal);
    } else if (entry.booktitle) {
      add("booktitle", entry.booktitle);
    }
    add("year", entry.year);
    add("volume", entry.volume);
    add("number", entry.number);
    add("pages", entry.pages);
    add("publisher", entry.publisher);
    add("organization", entry.organization);
    add("month", entry.month);
    add("note", entry.note);
    if (entry.doi) {
      const m = String(entry.doi).match(/doi\.org\/(.+)$/i);
      add("doi", m ? m[1] : entry.doi);
    }
    if (entry.url && entry.url !== entry.doi) add("url", entry.url);

    return `@${bibType}{${key},\n${fields.join(",\n")}\n}`;
  }

  async function loadPublications() {
    try {
      const [pubRes, citeRes] = await Promise.all([
        fetch("data/publications.json"),
        fetch("data/citations.json")
      ]);
      const pubJson = await pubRes.json();
      citationsData = await citeRes.json();

      allPublications = pubJson.publications.map((wrapper) => {
        const key = Object.keys(wrapper)[0];
        const entry = wrapper[key];
        const type = classifyType(entry);
        return {
          key,
          title: entry.title || "Untitled",
          author: entry.author || "",
          year: parseInt(entry.year, 10) || 0,
          venue: formatVenue(entry),
          type,
          link: pubLink(entry),
          academia: entry.academia || null,
          citationKeys: entry.citations || [],
          // Optional fields — present only once added to publications.json;
          // the UI degrades gracefully when they're absent.
          image: entry.image || null,
          abstract: entry.abstract || null,
          // Higher "feature" values are surfaced first under the Featured
          // sort; publications without a feature field sort as 0 (lowest).
          feature: parseInt(entry.feature, 10) || 0,
          bibtex: generateBibtex(entry, key, type)
        };
      });

      renderPublications();
    } catch (err) {
      if (pubCountEl) pubCountEl.textContent = "Publications could not be loaded. Please check your connection and try again.";
      console.error("Failed to load publication data:", err);
    }
  }

  function getFilteredSorted() {
    let list = allPublications.slice();

    if (state.type !== "all") {
      list = list.filter((p) => p.type === state.type);
    }
    if (state.query.trim()) {
      const q = state.query.trim().toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.venue.toLowerCase().includes(q) ||
        (p.abstract && p.abstract.toLowerCase().includes(q))
      );
    }

    switch (state.sort) {
      case "year-asc":
        list.sort((a, b) => a.year - b.year);
        break;
      case "year-desc":
        list.sort((a, b) => b.year - a.year);
        break;
      case "citations-desc":
        list.sort((a, b) => b.citationKeys.length - a.citationKeys.length || b.year - a.year);
        break;
      case "title-asc":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // feature-desc
        list.sort((a, b) => b.feature - a.feature || b.year - a.year);
    }
    return list;
  }

  function renderPubItem(p) {
    const li = document.createElement("li");
    li.className = "pub-item";
    li.dataset.pubKey = p.key;

    const panelId = `pub-panel-${p.key}`;

    li.innerHTML = `
      <div class="pub-item__row">
        <div class="pub-item__main">
          <span class="pub-item__year">${p.year || "n.d."}<span class="pub-item__type">${p.type}</span></span>
          <h3 class="pub-item__title">
            <button type="button" class="pub-item__title-btn" aria-expanded="false" aria-controls="${panelId}">
              ${p.title}
            </button>
          </h3>
          <p class="pub-item__authors">${formatAuthors(p.author)}</p>
          ${p.venue ? `<p class="pub-item__venue">${p.venue}</p>` : ""}
        </div>
        <button type="button" class="pub-item__expand-btn" aria-expanded="false" aria-controls="${panelId}" aria-label="Show details for ${p.title.replace(/"/g, "&quot;")}">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="pub-item__panel" id="${panelId}" hidden></div>
    `;
    return li;
  }

  function buildPubPanelContent(p) {
    const frag = document.createDocumentFragment();

    if (p.image) {
      const figure = document.createElement("figure");
      figure.className = "pub-item__figure";
      figure.innerHTML = `<img src="${p.image}" alt="" loading="lazy">`;
      frag.appendChild(figure);
    }

    const body = document.createElement("div");
    body.className = "pub-item__panel-body";

    let bodyHtml = "";

    if (p.abstract) {
      bodyHtml += `
        <div class="pub-item__abstract">
          <h4>Abstract</h4>
          <p>${p.abstract}</p>
        </div>
      `;
    }

    if (p.link) {
      let links="";
      links += `
        <p class="pub-item__view-link">
          <a href="${p.link}" target="_blank" rel="noopener noreferrer">
            Read publication
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10l8-8M4 2h6v6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>`;
      if (p.academia) {
        links += `
          &nbsp;
          <a href="${p.academia}" target="_blank" rel="noopener noreferrer">
            Academia
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10l8-8M4 2h6v6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        `;
      }
      links +=`  
      &nbsp;
          <a href="#contact">
            Request copy
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 10l8-8M4 2h6v6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>  
        </p>
      `;
      bodyHtml += links;

    }

    body.innerHTML = bodyHtml;
    frag.appendChild(body);

    const splitRow = document.createElement("div");
    splitRow.className = "pub-item__split";

    // --- citing works column ---
    const citeCount = p.citationKeys.length;
    if (citeCount > 0) {
      const citeCol = document.createElement("div");
    citeCol.className = "pub-item__cited-col";
      const citeItemsHtml = p.citationKeys.map((ck) => {
        const cite = citationsData[ck];
        if (cite) {
          const venue = cite.journal || cite.booktitle || "";
          return `
            <li>
              <span class="cite-title">${cite.title || ck}</span>
              <span class="cite-meta">${formatAuthors(cite.author || "")}${venue ? " &middot; " + venue : ""}${cite.year ? " &middot; " + cite.year : ""}</span>
            </li>
          `;
        }
        return `<li><span class="cite-title">${ck}</span></li>`;
      }).join("");
      citeCol.innerHTML = `
        <h4>Cited by ${citeCount} work${citeCount === 1 ? "" : "s"}</h4>
        <ol class="pub-item__cited-list">${citeItemsHtml}</ol>
      `;
      splitRow.appendChild(citeCol);
    } 
    

    // --- BibTeX column ---
    const bibCol = document.createElement("div");
    bibCol.className = "pub-item__bibtex-col";
    bibCol.innerHTML = `
      <h4>BibTeX</h4>
      <div class="bibtex-box">
        <button type="button" class="bibtex-copy-btn">Copy</button>
        <pre class="bibtex-pre"><code>${p.bibtex.replace(/</g, "&lt;")}</code></pre>
      </div>
    `;
    splitRow.appendChild(bibCol);

    frag.appendChild(splitRow);
    return frag;
  }

  function togglePubItem(li, forceOpen) {
    const titleBtn = li.querySelector(".pub-item__title-btn");
    const expandBtn = li.querySelector(".pub-item__expand-btn");
    const panel = li.querySelector(".pub-item__panel");
    if (!titleBtn || !expandBtn || !panel) return;

    const isOpen = titleBtn.getAttribute("aria-expanded") === "true";
    const nextOpen = typeof forceOpen === "boolean" ? forceOpen : !isOpen;
    if (nextOpen === isOpen) return;

    titleBtn.setAttribute("aria-expanded", String(nextOpen));
    expandBtn.setAttribute("aria-expanded", String(nextOpen));
    li.classList.toggle("is-open", nextOpen);

    if (nextOpen) {
      if (!panel.dataset.built) {
        const p = allPublications.find((pub) => pub.key === li.dataset.pubKey);
        if (p) {
          panel.appendChild(buildPubPanelContent(p));
          panel.dataset.built = "true";
        }
      }
      panel.hidden = false;
    } else {
      panel.hidden = true;
    }
  }

  if (pubListEl) {
    pubListEl.addEventListener("click", (e) => {
      const trigger = e.target.closest(".pub-item__title-btn, .pub-item__expand-btn");
      if (!trigger) return;
      const li = trigger.closest(".pub-item");
      if (li) togglePubItem(li);
    });

    // Copy-to-clipboard for BibTeX (event delegation; panels are built lazily)
    pubListEl.addEventListener("click", async (e) => {
      const copyBtn = e.target.closest(".bibtex-copy-btn");
      if (!copyBtn) return;
      const pre = copyBtn.parentElement.querySelector(".bibtex-pre");
      const text = pre ? pre.textContent : "";
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        // Fallback for browsers/contexts without Clipboard API access
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e2) { /* no-op */ }
        document.body.removeChild(ta);
      }
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("is-copied");
      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.classList.remove("is-copied");
      }, 1800);
    });
  }

  const pubShowMoreEl = document.getElementById("pubShowMore");
  const pubIncremental = pubListEl && pubShowMoreEl
    ? createIncrementalRenderer({
        listEl: pubListEl,
        moreWrapEl: pubShowMoreEl,
        renderItem: renderPubItem,
        batchSize: 12,
        noun: "publications"
      })
    : null;

  function renderPublications() {
    const list = getFilteredSorted();

    if (pubCountEl) {
      pubCountEl.textContent = `${list.length} of ${allPublications.length} publications match your filters`;
    }

    if (!pubListEl || !pubIncremental) return;

    if (list.length === 0) {
      pubListEl.innerHTML = "";
      pubShowMoreEl.innerHTML = "";
      pubEmptyEl.hidden = false;
      return;
    }
    pubEmptyEl.hidden = true;
    pubIncremental.setItems(list);
  }

  // --- controls wiring ---
  if (pubSearchEl) {
    let debounceTimer;
    pubSearchEl.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.query = e.target.value;
        renderPublications();
      }, 150);
    });
  }
  if (pubSortEl) {
    pubSortEl.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderPublications();
    });
  }
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      filterChips.forEach((c) => {
        c.classList.remove("is-active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");
      state.type = chip.getAttribute("data-filter-type");
      renderPublications();
    });
  });
  if (pubResetBtn) {
    pubResetBtn.addEventListener("click", () => {
      state = { query: "", type: "all", sort: "feature-desc" };
      if (pubSearchEl) pubSearchEl.value = "";
      if (pubSortEl) pubSortEl.value = "feature-desc";
      filterChips.forEach((c) => {
        const isAll = c.getAttribute("data-filter-type") === "all";
        c.classList.toggle("is-active", isAll);
        c.setAttribute("aria-pressed", String(isAll));
      });
      renderPublications();
    });
  }

  loadPublications();
})();
