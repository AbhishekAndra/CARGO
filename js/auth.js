/* =========================================================
   Stackly — demo client-side auth + dashboard
   ---------------------------------------------------------
   IMPORTANT: This is a front-end demo only. There is no
   server, no database and no real authentication. Accounts
   and passwords are stored in the browser's localStorage in
   plain text purely so the signup/login/dashboard flow can
   be demonstrated without a backend. Do NOT reuse a real
   password here, and do not treat this as production-ready
   auth — wire it up to a real backend before going live.
========================================================= */
(function () {
  "use strict";

  var USERS_KEY = "ti_users";
  var SESSION_KEY = "ti_session";

  /* ---------------------------------------------------------
     Storage helpers
  --------------------------------------------------------- */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUserByEmail(email) {
    var normalized = String(email || "").trim().toLowerCase();
    return getUsers().find(function (u) { return u.email.toLowerCase() === normalized; });
  }

  function setSession(user, role) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      fullName: user.fullName,
      company: user.company || "",
      email: user.email,
      phone: user.phone || "",
      memberSince: user.memberSince,
      role: role || "client",
    }));
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function ensureDemoUser() {
    if (!findUserByEmail("demo@stackly.com")) {
      var users = getUsers();
      users.push({
        fullName: "Jordan Blake",
        company: "Blake Freight Co.",
        email: "demo@stackly.com",
        phone: "+1 (234) 555-0102",
        password: "demo1234",
        memberSince: "Aug 2026",
      });
      saveUsers(users);
    }
    return findUserByEmail("demo@stackly.com");
  }

  function initials(name) {
    var parts = String(name || "?").trim().split(/\s+/);
    var first = parts[0] ? parts[0][0] : "";
    var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "?";
  }

  function firstName(name) {
    return String(name || "").trim().split(/\s+/)[0] || "there";
  }

  function guessNameFromEmail(email) {
    var local = String(email || "").split("@")[0] || "";
    var parts = local.split(/[.\-_+0-9]+/).filter(Boolean);
    if (!parts.length) return "Guest";
    return parts
      .map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); })
      .join(" ");
  }

  function monthYear() {
    var d = new Date();
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[d.getMonth()] + " " + d.getFullYear();
  }

  /* ---------------------------------------------------------
     Header auth slot — shown on every page
  --------------------------------------------------------- */
  function renderHeaderAuth() {
    var link = document.getElementById("headerAuthLink");
    var userBox = document.getElementById("headerUser");
    if (!link && !userBox) return;

    var session = getSession();

    if (session) {
      if (link) link.classList.add("is-hidden");
      if (userBox) {
        userBox.classList.add("is-active");
        var avatar = document.getElementById("headerUserAvatar");
        var nameEl = document.getElementById("headerUserName");
        if (avatar) avatar.textContent = initials(session.fullName);
        if (nameEl) {
          nameEl.innerHTML = firstName(session.fullName) + "<span>View Dashboard</span>";
          // Update dashboard link based on role
          try {
            var role = session.role || 'client';
            if (role === 'admin') nameEl.setAttribute('href', 'admin-dashboard.html');
            else if (role === 'client') nameEl.setAttribute('href', 'client-dashboard.html');
            else nameEl.setAttribute('href', 'dashboard.html');
          } catch (e) {}
        }
      }
    } else {
      if (link) link.classList.remove("is-hidden");
      if (userBox) userBox.classList.remove("is-active");
    }
  }

  function wireLogoutButtons() {
    var buttons = document.querySelectorAll(".js-logout");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        clearSession();
        window.location.href = "index.html";
      });
    });
  }

  /* ---------------------------------------------------------
     Signup form
  --------------------------------------------------------- */
  function wireSignupForm() {
    var form = document.getElementById("signupForm");
    if (!form) return;
    var status = document.getElementById("signupStatus");

    function setError(field, hasError) {
      var wrap = field.closest(".field");
      if (wrap) wrap.classList.toggle("has-error", hasError);
    }

    function validEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function showStatus(msg, isError) {
      status.textContent = msg;
      status.classList.toggle("is-error", !!isError);
      status.classList.toggle("is-ok", !isError);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fullName = form.querySelector("#su-name");
      var email = form.querySelector("#su-email");
      var password = form.querySelector("#su-password");
      var confirm = form.querySelector("#su-confirm");
      var terms = form.querySelector("#su-terms");
      var valid = true;

      if (!fullName.value.trim()) { setError(fullName, true); valid = false; } else { setError(fullName, false); }
      if (!email.value.trim() || !validEmail(email.value.trim())) { setError(email, true); valid = false; } else { setError(email, false); }
      if (!password.value || password.value.length < 6) { setError(password, true); valid = false; } else { setError(password, false); }
      if (!confirm.value || confirm.value !== password.value) { setError(confirm, true); valid = false; } else { setError(confirm, false); }

      if (!valid) {
        showStatus("Please fix the highlighted fields.", true);
        return;
      }
      if (terms && !terms.checked) {
        showStatus("Please accept the Terms of Service to continue.", true);
        return;
      }
      if (findUserByEmail(email.value.trim())) {
        showStatus("An account with this email already exists — try logging in instead.", true);
        return;
      }

      var company = form.querySelector("#su-company");
      var phone = form.querySelector("#su-phone");
      var newUser = {
        fullName: fullName.value.trim(),
        company: company ? company.value.trim() : "",
        email: email.value.trim(),
        phone: phone ? phone.value.trim() : "",
        password: password.value,
        memberSince: monthYear(),
      };

      var users = getUsers();
      users.push(newUser);
      saveUsers(users);
      setSession(newUser);

      showStatus("Account created! Redirecting to your dashboard…", false);
      setTimeout(function () { window.location.href = "dashboard.html"; }, 700);
    });
  }

  /* ---------------------------------------------------------
     Login form
  --------------------------------------------------------- */
  function wireLoginForm() {
    var form = document.getElementById("loginForm");
    if (!form) return;
    var status = document.getElementById("loginStatus");

    function setError(field, hasError) {
      var wrap = field.closest(".field");
      if (wrap) wrap.classList.toggle("has-error", hasError);
    }

    function showStatus(msg, isError) {
      status.textContent = msg;
      status.classList.toggle("is-error", !!isError);
      status.classList.toggle("is-ok", !isError);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = form.querySelector("#li-email");
      var password = form.querySelector("#li-password");
      var valid = true;

      if (!email.value.trim()) { setError(email, true); valid = false; } else { setError(email, false); }
      if (!password.value) { setError(password, true); valid = false; } else { setError(password, false); }

      if (!valid) {
        showStatus("Please enter your email and password.", true);
        return;
      }

      // Demo mode: any email + password combination signs you in.
      // If that email already has an account (e.g. from signup.html),
      // we log into that real profile; otherwise we spin up a
      // lightweight account on the fly so the dashboard has a name,
      // and so logging in again with the same email stays consistent.
      var user = findUserByEmail(email.value.trim());
      if (!user) {
        user = {
          fullName: guessNameFromEmail(email.value.trim()),
          company: "",
          email: email.value.trim(),
          phone: "",
          password: password.value,
          memberSince: monthYear(),
        };
        var users = getUsers();
        users.push(user);
        saveUsers(users);
      }

      var roleEl = form.querySelector("#li-role");
      var role = roleEl ? roleEl.value : "client";
      setSession(user, role);
      showStatus("Welcome back, " + firstName(user.fullName) + "! Redirecting…", false);
      setTimeout(function () {
        if (role === 'admin') window.location.href = 'admin-dashboard.html';
        else if (role === 'client') window.location.href = 'client-dashboard.html';
        else window.location.href = 'dashboard.html';
      }, 500);
    });

    var demoBtn = document.getElementById("demoLoginBtn");
    if (demoBtn) {
      demoBtn.addEventListener("click", function () {
        var demoUser = ensureDemoUser();
        setSession(demoUser, 'client');
        showStatus("Signed in with the demo account. Redirecting…", false);
        setTimeout(function () { window.location.href = "client-dashboard.html"; }, 500);
      });
    }

  }

  /* ---------------------------------------------------------
     Dashboard guard + render
  --------------------------------------------------------- */
  var MOCK_SHIPMENTS = [
    { id: "TI-48213", origin: "Shanghai, CN", destination: "Los Angeles, US", mode: "Ocean · FCL", status: "transit", eta: "Aug 21, 2026" },
    { id: "TI-58820", origin: "Rotterdam, NL", destination: "Portside, ST", mode: "Ocean · LCL", status: "delivered", eta: "Aug 09, 2026" },
    { id: "TI-60142", origin: "Portside, ST", destination: "Chicago, US", mode: "Land · FTL", status: "pending", eta: "Aug 24, 2026" },
    { id: "TI-55190", origin: "Hong Kong, CN", destination: "Hamburg, DE", mode: "Air Charter", status: "delayed", eta: "Aug 18, 2026" },
    { id: "TI-61007", origin: "Singapore, SG", destination: "Portside, ST", mode: "Ocean · FCL", status: "transit", eta: "Aug 27, 2026" },
  ];

  var BADGE_LABEL = {
    transit: "In Transit",
    delivered: "Delivered",
    pending: "Pending",
    delayed: "Delayed",
  };

  function renderShipmentRow(s) {
    return (
      '<tr>' +
      '<td class="mono">' + s.id + '</td>' +
      '<td>' + s.origin + ' &rarr; ' + s.destination + '</td>' +
      '<td>' + s.mode + '</td>' +
      '<td><span class="badge badge-' + s.status + '">' + BADGE_LABEL[s.status] + '</span></td>' +
      '<td>' + s.eta + '</td>' +
      '</tr>'
    );
  }

  function initDashboard() {
    var body = document.body;
    if (body.getAttribute("data-page") !== "dashboard") return;

    var session = getSession();
    if (!session) {
      window.location.href = "login.html";
      return;
    }

    // Enforce role-specific dashboard access: redirect if user on wrong dashboard
    try {
      var pagePath = window.location.pathname.split('/').pop();
      var expectedRole = body.getAttribute('data-role') || null; // 'admin' or 'client' if page indicates
      var userRole = session.role || 'client';

      if (pagePath === 'admin-dashboard.html' && userRole !== 'admin') {
        // not authorized for admin, send to client dashboard
        window.location.href = 'client-dashboard.html';
        return;
      }
      if (pagePath === 'client-dashboard.html' && userRole !== 'client') {
        // not a client, send to admin dashboard
        window.location.href = 'admin-dashboard.html';
        return;
      }
      // If a generic dashboard.html is present, route by role
      if (pagePath === 'dashboard.html') {
        if (userRole === 'admin') { window.location.href = 'admin-dashboard.html'; return; }
        if (userRole === 'client') { window.location.href = 'client-dashboard.html'; return; }
      }
    } catch (e) { }

    // Topbar + welcome
    var welcomeName = document.getElementById("dashWelcomeName");
    if (welcomeName) welcomeName.textContent = firstName(session.fullName);

    var userAvatar = document.getElementById("dashUserAvatar");
    if (userAvatar) userAvatar.textContent = initials(session.fullName);

    var userName = document.getElementById("dashUserName");
    if (userName) userName.textContent = session.fullName;

    var userCompany = document.getElementById("dashUserCompany");
    if (userCompany) userCompany.textContent = session.company || "Verified Client";

    // Profile card
    var profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) profileAvatar.textContent = initials(session.fullName);
    var profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = session.fullName;
    var profileCompany = document.getElementById("profileCompany");
    if (profileCompany) profileCompany.textContent = session.company || "Verified Client";
    var profileEmail = document.getElementById("profileEmail");
    if (profileEmail) profileEmail.textContent = session.email;
    var profilePhone = document.getElementById("profilePhone");
    if (profilePhone) profilePhone.textContent = session.phone || "—";
    var profileSince = document.getElementById("profileSince");
    if (profileSince) profileSince.textContent = session.memberSince || monthYear();

    // Shipments table
    var tableBody = document.getElementById("shipmentsTableBody");
    if (tableBody) {
      tableBody.innerHTML = MOCK_SHIPMENTS.map(renderShipmentRow).join("");
    }

    // Stat cards (derived from mock data so numbers stay consistent)
    var counts = MOCK_SHIPMENTS.reduce(function (acc, s) {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    var statActive = document.getElementById("statActive");
    if (statActive) statActive.textContent = String((counts.transit || 0) + (counts.pending || 0) + (counts.delayed || 0));
    var statTransit = document.getElementById("statTransit");
    if (statTransit) statTransit.textContent = String(counts.transit || 0);
    var statDelivered = document.getElementById("statDelivered");
    if (statDelivered) statDelivered.textContent = String(counts.delivered || 0);
    var statPending = document.getElementById("statPending");
    if (statPending) statPending.textContent = String(counts.pending || 0);

    // Mobile sidebar toggle
    var menuToggle = document.getElementById("dashMenuToggle");
    var sidebar = document.getElementById("dashSidebar");
    var overlay = document.getElementById("dashOverlay");
    function closeSidebar() {
      if (sidebar) sidebar.classList.remove("is-open");
      if (overlay) overlay.classList.remove("is-visible");
    }
    if (menuToggle && sidebar) {
      menuToggle.addEventListener("click", function () {
        sidebar.classList.toggle("is-open");
        if (overlay) overlay.classList.toggle("is-visible");
      });
    }
    if (overlay) overlay.addEventListener("click", closeSidebar);

    // Track & Trace mini widget
    var trackForm = document.getElementById("trackForm");
    if (trackForm) {
      var trackResult = document.getElementById("trackResult");
      trackForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.getElementById("trackInput");
        var query = input.value.trim().toUpperCase();
        var match = MOCK_SHIPMENTS.find(function (s) { return s.id === query; });

        if (!match) {
          trackResult.innerHTML =
            '<strong>No shipment found</strong> for "' + (input.value.trim() || "—") + '". ' +
            'Try a demo ID like <strong>TI-48213</strong> or <strong>TI-60142</strong>.';
        } else {
          trackResult.innerHTML =
            '<strong>' + match.id + '</strong> — ' + match.origin + ' &rarr; ' + match.destination + '<br>' +
            match.mode + ' · ETA ' + match.eta +
            '<span class="badge badge-' + match.status + '">' + BADGE_LABEL[match.status] + '</span>';
        }
        trackResult.classList.add("is-visible");
      });
    }
  }

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderHeaderAuth();
    wireLogoutButtons();
    wireSignupForm();
    wireLoginForm();
    initDashboard();
  });
})();
