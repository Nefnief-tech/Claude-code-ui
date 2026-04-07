// Scroll-triggered animations
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

// Apply animate-in to key sections
document.querySelectorAll(
  ".feature-card, .workflow-step, .integration-card, .stat, .cta-card"
).forEach((el) => {
  el.classList.add("animate-in");
  observer.observe(el);
});

// Navbar background on scroll
const nav = document.getElementById("nav");
let lastScroll = 0;

window.addEventListener("scroll", () => {
  const scroll = window.scrollY;
  if (scroll > 50) {
    nav.style.background = "rgba(12, 10, 20, 0.95)";
  } else {
    nav.style.background = "rgba(12, 10, 20, 0.8)";
  }
  lastScroll = scroll;
}, { passive: true });

// Smooth scroll for anchor links
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
