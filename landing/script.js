// ===== Scroll Progress Bar =====
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (scrollTop / docHeight) * 100;
  scrollProgress.style.width = progress + '%';
}, { passive: true });

// ===== Scroll-triggered animations =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".animate-in").forEach((el) => observer.observe(el));

// ===== Navbar scroll state =====
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  const scroll = window.scrollY;
  if (scroll > 50) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }
}, { passive: true });

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const href = anchor.getAttribute("href");
    if (href === "#") return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ===== Mouse-follow glow in hero =====
const hero = document.getElementById("hero");
const mouseGlow = document.getElementById("mouseGlow");

hero.addEventListener("mousemove", (e) => {
  const rect = hero.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  mouseGlow.style.left = x + "px";
  mouseGlow.style.top = y + "px";
});

// ===== Particle System =====
const particlesContainer = document.getElementById("heroParticles");

function createParticle() {
  const particle = document.createElement("div");
  particle.classList.add("particle");

  const x = Math.random() * 100;
  const duration = 4 + Math.random() * 6;
  const delay = Math.random() * 2;
  const size = 1 + Math.random() * 2;

  particle.style.left = x + "%";
  particle.style.bottom = "10%";
  particle.style.width = size + "px";
  particle.style.height = size + "px";
  particle.style.animationDuration = duration + "s";
  particle.style.animationDelay = delay + "s";

  // Vary particle colors
  const colors = ["var(--accent)", "var(--accent-bright)", "var(--blue)", "var(--cyan)"];
  particle.style.background = colors[Math.floor(Math.random() * colors.length)];

  particlesContainer.appendChild(particle);

  setTimeout(() => {
    particle.remove();
  }, (duration + delay) * 1000);
}

// Spawn particles periodically
setInterval(createParticle, 300);
// Initial burst
for (let i = 0; i < 15; i++) {
  setTimeout(createParticle, i * 100);
}

// ===== Animated Counters =====
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const prefix = el.dataset.prefix || "";
        const suffix = el.dataset.suffix || "";

        if (target === 0) {
          el.textContent = prefix + "0" + suffix;
          counterObserver.unobserve(el);
          return;
        }

        const duration = 1500;
        const startTime = performance.now();

        function animate(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(eased * target);
          el.textContent = prefix + current + suffix;

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        }

        requestAnimationFrame(animate);
        counterObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll(".stat-number[data-target]").forEach((el) => {
  counterObserver.observe(el);
});

// ===== Workflow Connector Animation =====
const connectorObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll(".workflow-connector").forEach((el) => {
  connectorObserver.observe(el);
});

// ===== Parallax on screenshot =====
const screenshot = document.querySelector(".screenshot-image");
window.addEventListener("scroll", () => {
  if (!screenshot) return;
  const rect = screenshot.getBoundingClientRect();
  const visible = rect.top < window.innerHeight && rect.bottom > 0;
  if (visible) {
    const offset = (rect.top / window.innerHeight) * 10;
    screenshot.style.transform = `translateY(${-offset}px)`;
  }
}, { passive: true });
