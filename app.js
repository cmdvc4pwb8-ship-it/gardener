/* =============================================
   app.js — Gardener main JavaScript
   Modules: DB, Auth, UI, Modals, Interactions
   ============================================= */

// ===== LOCAL DATABASE =====
const API = {
  async post(url, data = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return await res.json();
  },

  async get(url) {
    const res = await fetch(url);
    return await res.json();
  }
};
// ===== AUTH MODULE =====
const Auth = {
  async login(email, password) {
    return await API.post('api/login.php', {
      email,
      password
    });
  },

  async register(name, email, password) {
    return await API.post('api/register.php', {
      name,
      email,
      password
    });
  },

  async logout() {
    await API.get('api/logout.php');
    UI.updateNavForUser(null);
  },

  async current() {
    const data = await API.get('api/session.php');
    return data.logged ? data.user : null;
  }
};

// ===== UI MODULE =====
const UI = {
  updateNavForUser(user) {
    const userInfo    = document.getElementById('user-info');
    const authButtons = document.getElementById('auth-buttons');
    const nameDisplay = document.getElementById('user-name-display');
    const adminLink   = document.getElementById('admin-link');
    if (user) {
      userInfo?.classList.remove('hidden');
      authButtons?.classList.add('hidden');
      if (nameDisplay) nameDisplay.textContent = `Привет, ${user.name.split(' ')[0]}!`;
      adminLink && (user.role === 'admin' ? adminLink.classList.remove('hidden') : adminLink.classList.add('hidden'));
    } else {
      userInfo?.classList.add('hidden');
      authButtons?.classList.remove('hidden');
    }
  },
  showError(id, msg)    { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.classList.remove('hidden'); },
  hideError(id)         { document.getElementById(id)?.classList.add('hidden'); },
  showSuccess(id, msg)  { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.classList.remove('hidden'); }
};

// ===== MODAL MODULE =====
const Modal = {
  open(id)    { const o = document.getElementById(id); if (o) { o.classList.add('open'); document.body.style.overflow = 'hidden'; } },
  close(id)   { const o = document.getElementById(id); if (o) { o.classList.remove('open'); document.body.style.overflow = ''; } },
  closeAll()  { document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); document.body.style.overflow = ''; }
};



  // Navbar scroll
  window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Burger
  document.getElementById('burger')?.addEventListener('click', () => document.getElementById('mobile-menu')?.classList.add('open'));
  document.getElementById('mobile-close')?.addEventListener('click', () => document.getElementById('mobile-menu')?.classList.remove('open'));
  document.querySelectorAll('.mobile-menu a').forEach(a => a.addEventListener('click', () => document.getElementById('mobile-menu')?.classList.remove('open')));

  // Auth modal triggers
  document.getElementById('open-login')?.addEventListener('click',    () => Modal.open('modal-login'));
  document.getElementById('open-register')?.addEventListener('click', () => Modal.open('modal-register'));
  document.getElementById('mob-login')?.addEventListener('click',     () => { document.getElementById('mobile-menu')?.classList.remove('open'); Modal.open('modal-login'); });
  document.getElementById('mob-register')?.addEventListener('click',  () => { document.getElementById('mobile-menu')?.classList.remove('open'); Modal.open('modal-register'); });

  // Switch
  document.getElementById('switch-to-register')?.addEventListener('click', e => { e.preventDefault(); Modal.close('modal-login'); Modal.open('modal-register'); });
  document.getElementById('switch-to-login')?.addEventListener('click',    e => { e.preventDefault(); Modal.close('modal-register'); Modal.open('modal-login'); });

  // Close buttons
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => Modal.close(btn.dataset.close)));
  document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', e => { if (e.target === overlay) Modal.close(overlay.id); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') Modal.closeAll(); });

  // ---- LOGIN ----
  document.getElementById('login-submit')?.addEventListener('click', async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    UI.hideError('login-error');
    const r = await Auth.login(email, password);
    
    if (r.ok) {
      Modal.close('modal-login');
      UI.updateNavForUser(r.user);
      clearLoginForm();
      showToast(r.user.role === 'admin' ? 'Добро пожаловать, Администратор!' : `Добро пожаловать, ${r.user.name}!`);
    } else { UI.showError('login-error', r.error); }
  });
  document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-submit')?.click(); });


  // ---- REGISTER ----
document.getElementById('reg-submit')?.addEventListener('click', async () => {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const termsAccepted = document.getElementById('reg-terms')?.checked;

  UI.hideError('reg-error');
  UI.hideError('reg-success');

  if (password !== confirm) {
    UI.showError('reg-error', 'Пароли не совпадают');
    return;
  }

  if (!termsAccepted) {
    UI.showError('reg-error', 'Примите соглашение');
    return;
  }

  const r = await Auth.register(name, email, password);

  if (r.ok) {
    UI.showSuccess('reg-success', 'Аккаунт создан! Теперь войдите в систему.');

    setTimeout(() => {
      Modal.close('modal-register');
      Modal.open('modal-login');
      clearRegisterForm();
    }, 1500);

  } else {
    UI.showError('reg-error', r.error);
  }
});

  // ---- LOGOUT ----
  document.getElementById('logout-btn')?.addEventListener('click', () => { Auth.logout(); showToast('Вы вышли из аккаунта'); });

  // ---- CONSULT MODAL ----
  document.getElementById('hero-consult')?.addEventListener('click',  () => Modal.open('modal-consult'));
  document.getElementById('about-consult')?.addEventListener('click', () => Modal.open('modal-consult'));
  document.getElementById('cons-submit')?.addEventListener('click', () => {
    const name    = document.getElementById('cons-name').value.trim();
    const phone   = document.getElementById('cons-phone').value.trim();
    const service = document.getElementById('cons-service').value;
    if (!name || !phone) { showToast('Заполните имя и телефон'); return; }
    DB.addRequest({ type: 'consult', name, phone, service });
    UI.showSuccess('cons-success', 'Заявка принята! Скоро перезвоним.');
    document.getElementById('cons-name').value = '';
    document.getElementById('cons-phone').value = '';
    document.getElementById('cons-service').value = '';
    setTimeout(() => { Modal.close('modal-consult'); document.getElementById('cons-success')?.classList.add('hidden'); }, 2000);
  });

  // ---- CONTACT FORM ----
  document.getElementById('cf-submit')?.addEventListener('click', () => {
    const name  = document.getElementById('cf-name').value.trim();
    const phone = document.getElementById('cf-phone').value.trim();
    const msg   = document.getElementById('cf-msg').value.trim();
    if (!name || !phone) { showToast('Заполните имя и телефон'); return; }
    DB.addRequest({ type: 'contact', name, phone, message: msg });
    UI.showSuccess('cf-success', 'Заявка отправлена! Мы свяжемся с вами.');
    document.getElementById('cf-name').value = '';
    document.getElementById('cf-phone').value = '';
    document.getElementById('cf-msg').value = '';
  });

  // ---- TERMS MODAL ----
  const openTerms = () => Modal.open('modal-terms');
  document.getElementById('footer-terms')?.addEventListener('click',       e => { e.preventDefault(); openTerms(); });
  document.getElementById('footer-terms-2')?.addEventListener('click',     e => { e.preventDefault(); openTerms(); });
  document.getElementById('open-terms-from-reg')?.addEventListener('click', e => {
    e.preventDefault();
    Modal.open('modal-terms');
  });
  document.getElementById('accept-terms-btn')?.addEventListener('click', () => {
    const checkbox = document.getElementById('reg-terms');
    if (checkbox) checkbox.checked = true;
    Modal.close('modal-terms');
    // Re-open register if it's not open
    if (!document.getElementById('modal-register')?.classList.contains('open')) {
      Modal.open('modal-register');
    }
    showToast('Соглашение принято');
  });

  // ---- PORTFOLIO FILTER ----
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.portfolio-item').forEach(item => {
        item.classList.toggle('hidden-filter', filter !== 'all' && item.dataset.cat !== filter);
      });
    });
  });

  initScrollAnimations();

// ===== HELPERS =====
function clearLoginForm() {
  ['login-email', 'login-password'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  UI.hideError('login-error');
}
function clearRegisterForm() {
  ['reg-name', 'reg-email', 'reg-password', 'reg-confirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const cb = document.getElementById('reg-terms'); if (cb) cb.checked = false;
  UI.hideError('reg-error');
}

// ===== TOAST =====
function showToast(message) {
  document.getElementById('gd-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'gd-toast';
  toast.textContent = message;
  toast.style.cssText = `position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a3a2a;color:#fff;padding:14px 28px;border-radius:40px;font-family:'Jost',sans-serif;font-size:15px;font-weight:500;box-shadow:0 8px 32px rgba(0,0,0,.2);z-index:9999;opacity:0;transition:all .4s cubic-bezier(.4,0,.2,1);white-space:nowrap;`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)'; });
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(10px)'; setTimeout(() => toast.remove(), 400); }, 3000);
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
  const style = document.createElement('style');
  style.textContent = `.anim-ready{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}.anim-ready.visible{opacity:1!important;transform:translateY(0)!important}`;
  document.head.appendChild(style);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });

  document.querySelectorAll('.service-card, .portfolio-item, .testimonial-card, .team-card, .about-wrap, .contact-wrap').forEach((el, i) => {
    el.classList.add('anim-ready');
    if (el.classList.contains('service-card') || el.classList.contains('team-card')) {
      el.style.transitionDelay = `${(i % 6) * 70}ms`;
    }
    observer.observe(el);
  });
}

// Export for admin.js
window.DB   = DB;
window.Auth = Auth;
window.showToast = showToast;
