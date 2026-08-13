(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---------------------------------------------------------
     Preloader (robust): hide on load, but also on DOMContentLoaded
     or after a short timeout to avoid the preloader sticking.
  --------------------------------------------------------- */
  (function () {
    var preloader = document.getElementById("preloader");
    if (!preloader) return;
    var hidden = false;

    function hidePreloader() {
      if (hidden) return;
      hidden = true;
      preloader.classList.add("is-hidden");
      setTimeout(function () { try { preloader.remove(); } catch (e) {} }, 700);
    }

    window.addEventListener("load", hidePreloader);
    document.addEventListener("DOMContentLoaded", function () {
      // If load is slow, reveal the page after DOM ready so users aren't stuck.
      setTimeout(hidePreloader, 300);
    });

    // Absolute safety: remove preloader after 3 seconds if still visible
    setTimeout(hidePreloader, 3000);
  })();

  /* ---------------------------------------------------------
     Header: scroll state + mobile nav toggle
  --------------------------------------------------------- */
  var header = document.getElementById("siteHeader");
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  var navLinks = mainNav ? mainNav.querySelectorAll(".nav-link") : [];

  function onScrollHeader() {
    if (window.scrollY > 40) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }
  if (header) {
    onScrollHeader();
    window.addEventListener("scroll", onScrollHeader, { passive: true });
  }

  function closeNav() {
    navToggle.classList.remove("is-open");
    mainNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
    });

    navLinks.forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------------------------------------------------------
     Active nav link — based on the current page, not scroll
     position, since the site is now split into separate pages.
  --------------------------------------------------------- */
  var currentPage = document.body.getAttribute("data-page");
  if (currentPage && navLinks.length) {
    navLinks.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("data-page") === currentPage);
    });
  }

  /* ---------------------------------------------------------
     Reveal-on-scroll animations
  --------------------------------------------------------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          setTimeout(function () {
            el.classList.add("is-visible");
          }, (i % 6) * 80);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------------------------------------------------
     Animated counters (about stats)
  --------------------------------------------------------- */
  var counters = document.querySelectorAll("[data-counter]");
  if (counters.length) {
    var counterObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute("data-counter"), 10) || 0;
        var duration = 1400;
        var start = null;

        function step(ts) {
          if (start === null) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target).toLocaleString();
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = target.toLocaleString();
          }
        }
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.6 });

    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ---------------------------------------------------------
     Animated donut charts (results section)
  --------------------------------------------------------- */
  var donuts = document.querySelectorAll(".donut");
  var CIRCUMFERENCE = 2 * Math.PI * 52; // r=52

  if (donuts.length) {
    var donutObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var percent = parseInt(el.getAttribute("data-percent"), 10) || 0;
        var fill = el.querySelector(".donut-fill");
        var valueEl = el.querySelector(".donut-value");
        var offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;

        if (fill) {
          fill.style.strokeDasharray = String(CIRCUMFERENCE);
          fill.style.strokeDashoffset = String(CIRCUMFERENCE);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              fill.style.strokeDashoffset = String(offset);
            });
          });
        }

        if (valueEl) {
          var duration = 1400;
          var start = null;
          function step(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            valueEl.textContent = Math.round(eased * percent) + "%";
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }

        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    donuts.forEach(function (el) { donutObserver.observe(el); });
  }

  /* ---------------------------------------------------------
     Back to top button
  --------------------------------------------------------- */
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", function () {
      backToTop.classList.toggle("is-visible", window.scrollY > 600);
    }, { passive: true });

    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------------------------------------------------------
     Contact form — client-side validation only (no backend)
  --------------------------------------------------------- */
  var form = document.getElementById("contactForm");
  if (form) {
    var status = document.getElementById("formStatus");

    function setError(field, hasError) {
      field.closest(".field").classList.toggle("has-error", hasError);
    }

    function validEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector("#cf-name");
      var email = form.querySelector("#cf-email");
      var message = form.querySelector("#cf-message");
      var valid = true;

      if (!name.value.trim()) { setError(name, true); valid = false; } else { setError(name, false); }
      if (!email.value.trim() || !validEmail(email.value.trim())) { setError(email, true); valid = false; } else { setError(email, false); }
      if (!message.value.trim()) { setError(message, true); valid = false; } else { setError(message, false); }

      if (!valid) {
        status.textContent = "Please fix the highlighted fields.";
        status.style.color = "#ef6a5a";
        return;
      }

      status.style.color = "";
      status.textContent = "Thanks, " + name.value.trim().split(" ")[0] + "! Your message has been noted — our team will reach out shortly.";
      form.reset();
    });
  }

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Client testimonials carousel (Swiper)
  --------------------------------------------------------- */
  if (typeof Swiper !== "undefined" && document.querySelector(".testimonial-swiper")) {
    new Swiper(".testimonial-swiper", {
      loop: true,
      grabCursor: true,
      spaceBetween: 24,
      autoplay: { delay: 5500, disableOnInteraction: false },
      pagination: { el: ".testimonial-pagination", clickable: true },
      navigation: { nextEl: ".testimonial-next", prevEl: ".testimonial-prev" },
      breakpoints: { 0: { slidesPerView: 1 }, 760: { slidesPerView: 2 }, 1100: { slidesPerView: 3 } }
    });
  }

})();
