/* =============================================
   admin.js — GreenLeaf Admin Panel
   ============================================= */
const API = {
  async get(url) {
    const res = await fetch(url);
    return await res.json();
  },

  async post(url, data = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return await res.json();
  }
};
document.addEventListener('DOMContentLoaded', () => {
  // ---- ACCESS GUARD ----
  const session = Auth.current();
  if (!session || session.role !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  // Show admin user info
  const badge = document.getElementById('admin-user-badge');
  if (badge) {
    badge.querySelector('.aub-avatar').textContent = session.avatar || 'АД';
    badge.querySelector('span').textContent = session.name;
  }

  // ---- SIDEBAR TABS ----
  const tabs = document.querySelectorAll('.snav-item[data-tab]');
  const tabPanels = document.querySelectorAll('.admin-tab');
  const breadcrumb = document.getElementById('breadcrumb');

  const tabNames = {
    dashboard: 'Дашборд',
    users: 'Пользователи',
    requests: 'Заявки',
    settings: 'Настройки'
  };

  function switchTab(tabId) {
    tabs.forEach(t => t.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');
    if (breadcrumb) breadcrumb.textContent = tabNames[tabId] || tabId;

    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'users') renderUsers();
    if (tabId === 'requests') renderRequests();
    if (tabId === 'settings') loadSettings();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });

  // ---- BURGER (MOBILE) ----
  document.getElementById('burger-admin')?.addEventListener('click', () => {
    document.getElementById('admin-sidebar')?.classList.toggle('open');
  });

  // ---- LOGOUT ----
  document.getElementById('admin-logout')?.addEventListener('click', () => {
    Auth.logout();
    window.location.href = 'index.html';
  });

  // ---- MODALS ----
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  function openModal(id) {
    document.getElementById(id)?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ========== DASHBOARD ==========
  function renderDashboard() {
    const users = DB.getUsers();
    const requests = DB.getRequests();
    const newReqs = requests.filter(r => r.status === 'new');

    // Stats
    const statsRow = document.getElementById('stats-row');
    if (statsRow) {
      statsRow.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-icon">👥</div>
          <div class="stat-card-info">
            <span class="stat-card-num">${users.length}</span>
            <span class="stat-card-label">Пользователей</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon">📋</div>
          <div class="stat-card-info">
            <span class="stat-card-num">${requests.length}</span>
            <span class="stat-card-label">Заявок всего</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon">🆕</div>
          <div class="stat-card-info">
            <span class="stat-card-num">${newReqs.length}</span>
            <span class="stat-card-label">Новых заявок</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon">✅</div>
          <div class="stat-card-info">
            <span class="stat-card-num">${requests.filter(r => r.status === 'done').length}</span>
            <span class="stat-card-label">Выполнено</span>
          </div>
        </div>
      `;
    }

    // Recent requests
    const recentReqs = document.getElementById('recent-requests');
    if (recentReqs) {
      const last5 = requests.slice(0, 5);
      if (last5.length === 0) {
        recentReqs.innerHTML = '<p style="color:var(--text-light);font-size:14px">Заявок пока нет</p>';
      } else {
        recentReqs.innerHTML = last5.map(r => `
          <div class="recent-item">
            <div class="ri-left">
              <div class="ri-avatar">📋</div>
              <div class="ri-info">
                <strong>${escHtml(r.name)}</strong>
                <span>${escHtml(r.phone)} · ${r.service || r.type}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="status-badge status-${r.status}">${statusLabel(r.status)}</span>
              <span class="ri-date">${formatDate(r.createdAt)}</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Recent users
    const recentUsers = document.getElementById('recent-users');
    if (recentUsers) {
      const last5u = [...users].reverse().slice(0, 5);
      recentUsers.innerHTML = last5u.map(u => `
        <div class="recent-item">
          <div class="ri-left">
            <div class="ri-avatar">${u.avatar || '👤'}</div>
            <div class="ri-info">
              <strong>${escHtml(u.name)}</strong>
              <span>${escHtml(u.email)}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="role-badge role-${u.role}">${u.role === 'admin' ? '⭐ Админ' : 'Юзер'}</span>
            <span class="ri-date">${formatDate(u.createdAt)}</span>
          </div>
        </div>
      `).join('');
    }

    // Update badge
    const badge = document.getElementById('new-requests-badge');
    if (badge) badge.textContent = newReqs.length;
  }

  // ========== USERS ==========
  function renderUsers(filter = '') {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    let users = DB.getUsers();
    if (filter) {
      const q = filter.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="color:var(--text-light);font-size:12px">#${u.id}</td>
        <td>
          <div class="user-cell">
            <div class="user-cell-avatar">${u.avatar || '👤'}</div>
            <div class="user-cell-info">
              <strong>${escHtml(u.name)}</strong>
            </div>
          </div>
        </td>
        <td>${escHtml(u.email)}</td>
        <td><span class="role-badge role-${u.role}">${u.role === 'admin' ? '⭐ Администратор' : '👤 Пользователь'}</span></td>
        <td style="color:var(--text-light);font-size:13px">${formatDate(u.createdAt)}</td>
        <td>
          <div class="table-actions">
            <button class="act-btn act-edit" onclick="adminEditUser(${u.id})">✏️ Редактировать</button>
            ${u.id !== session.id ? `<button class="act-btn act-delete" onclick="adminDeleteUser(${u.id}, '${escHtml(u.name)}')">🗑</button>` : '<span style="font-size:12px;color:var(--text-light)">Вы</span>'}
          </div>
        </td>
      </tr>
    `).join('');
  }

  // User search
  document.getElementById('users-search')?.addEventListener('input', (e) => {
    renderUsers(e.target.value);
  });

  // Add user button
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    document.getElementById('user-modal-title').textContent = 'Добавить пользователя';
    document.getElementById('edit-user-id').value = '';
    document.getElementById('u-name').value = '';
    document.getElementById('u-email').value = '';
    document.getElementById('u-password').value = '';
    document.getElementById('u-role').value = 'user';
    document.getElementById('u-error').classList.add('hidden');
    openModal('modal-user');
  });

  // Save user
  document.getElementById('save-user-btn')?.addEventListener('click', () => {
    const id = document.getElementById('edit-user-id').value;
    const name = document.getElementById('u-name').value.trim();
    const email = document.getElementById('u-email').value.trim();
    const password = document.getElementById('u-password').value;
    const role = document.getElementById('u-role').value;
    const errEl = document.getElementById('u-error');
    errEl.classList.add('hidden');

    if (!name) { errEl.textContent = 'Введите имя'; errEl.classList.remove('hidden'); return; }
    if (!email.includes('@')) { errEl.textContent = 'Введите корректный email'; errEl.classList.remove('hidden'); return; }

    if (id) {
      // Edit
      const updateData = { name, email, role, avatar: name.slice(0,2).toUpperCase() };
      if (password) updateData.password = password;
      DB.updateUser(parseInt(id), updateData);
      showToast('✅ Пользователь обновлён');
    } else {
      // Add
      if (!password || password.length < 6) { errEl.textContent = 'Пароль мин. 6 символов'; errEl.classList.remove('hidden'); return; }
      if (DB.findUser(email)) { errEl.textContent = 'Email уже используется'; errEl.classList.remove('hidden'); return; }
      DB.addUser({ name, email, password, role });
      showToast('✅ Пользователь добавлен');
    }
    closeModal('modal-user');
    renderUsers();
    renderDashboard();
  });

  // Edit user (global)
  window.adminEditUser = (id) => {
    const user = DB.getUsers().find(u => u.id === id);
    if (!user) return;
    document.getElementById('user-modal-title').textContent = 'Редактировать пользователя';
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('u-name').value = user.name;
    document.getElementById('u-email').value = user.email;
    document.getElementById('u-password').value = '';
    document.getElementById('u-role').value = user.role;
    document.getElementById('u-error').classList.add('hidden');
    openModal('modal-user');
  };

  // Delete user (global)
  window.adminDeleteUser = (id, name) => {
    document.getElementById('confirm-title').textContent = 'Удалить пользователя?';
    document.getElementById('confirm-text').textContent = `Пользователь "${name}" будет удалён безвозвратно.`;
    document.getElementById('confirm-ok').onclick = () => {
      DB.deleteUser(id);
      closeModal('modal-confirm');
      renderUsers();
      renderDashboard();
      showToast('🗑 Пользователь удалён');
    };
    openModal('modal-confirm');
  };

  // ========== REQUESTS ==========
  function renderRequests(filter = 'all') {
    const tbody = document.getElementById('requests-tbody');
    const emptyEl = document.getElementById('req-empty');
    if (!tbody) return;

    let requests = DB.getRequests();
    if (filter !== 'all') requests = requests.filter(r => r.status === filter);

    if (requests.length === 0) {
      tbody.innerHTML = '';
      emptyEl?.classList.remove('hidden');
      return;
    }
    emptyEl?.classList.add('hidden');

    tbody.innerHTML = requests.map(r => `
      <tr>
        <td style="color:var(--text-light);font-size:12px">#${r.id}</td>
        <td><strong>${escHtml(r.name)}</strong></td>
        <td><a href="tel:${escHtml(r.phone)}" style="color:var(--green-mid)">${escHtml(r.phone)}</a></td>
        <td>${escHtml(r.service || '—')}</td>
        <td><span style="font-size:12px;color:var(--text-light)">${r.type === 'consult' ? '💬 Консульт.' : '📧 Контакт'}</span></td>
        <td style="font-size:12px;color:var(--text-light)">${formatDate(r.createdAt)}</td>
        <td><span class="status-badge status-${r.status}">${statusLabel(r.status)}</span></td>
        <td>
          <div class="table-actions">
            ${r.status !== 'in-work' && r.status !== 'done' ? `<button class="act-btn act-status" onclick="changeReqStatus(${r.id},'in-work')">▶ В работу</button>` : ''}
            ${r.status === 'in-work' ? `<button class="act-btn act-status" onclick="changeReqStatus(${r.id},'done')" style="border-color:var(--success);color:var(--success)">✓ Выполнено</button>` : ''}
            <button class="act-btn act-delete" onclick="deleteRequest(${r.id})">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Update badge
    const badge = document.getElementById('new-requests-badge');
    const newCount = DB.getRequests().filter(r => r.status === 'new').length;
    if (badge) badge.textContent = newCount;
  }

  document.getElementById('req-filter')?.addEventListener('change', (e) => {
    renderRequests(e.target.value);
  });

  window.changeReqStatus = (id, status) => {
    DB.updateRequest(id, { status });
    renderRequests(document.getElementById('req-filter')?.value || 'all');
    renderDashboard();
    showToast('✅ Статус обновлён');
  };

  window.deleteRequest = (id) => {
    document.getElementById('confirm-title').textContent = 'Удалить заявку?';
    document.getElementById('confirm-text').textContent = 'Заявка будет удалена безвозвратно.';
    document.getElementById('confirm-ok').onclick = () => {
      DB.deleteRequest(id);
      closeModal('modal-confirm');
      renderRequests(document.getElementById('req-filter')?.value || 'all');
      renderDashboard();
      showToast('🗑 Заявка удалена');
    };
    openModal('modal-confirm');
  };

  // ========== SETTINGS ==========
  function loadSettings() {
    const u = Auth.current();
    if (!u) return;
    document.getElementById('set-name').value = u.name;
    document.getElementById('set-email').value = u.email;
  }

  document.getElementById('save-profile')?.addEventListener('click', () => {
    const u = Auth.current();
    const name = document.getElementById('set-name').value.trim();
    const email = document.getElementById('set-email').value.trim();
    if (!name || !email.includes('@')) { showToast('⚠️ Заполните имя и email'); return; }
    DB.updateUser(u.id, { name, email, avatar: name.slice(0,2).toUpperCase() });
    const updated = DB.getUsers().find(usr => usr.id === u.id);
    DB.setSession(updated);
    showToast('✅ Профиль обновлён');
  });

  document.getElementById('save-password')?.addEventListener('click', () => {
    const u = Auth.current();
    const oldPass = document.getElementById('set-old-pass').value;
    const newPass = document.getElementById('set-new-pass').value;
    const confirmPass = document.getElementById('set-confirm-pass').value;
    const errEl = document.getElementById('pass-error');
    const okEl = document.getElementById('pass-success');
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    if (u.password !== oldPass) { errEl.textContent = 'Неверный текущий пароль'; errEl.classList.remove('hidden'); return; }
    if (newPass.length < 6) { errEl.textContent = 'Новый пароль мин. 6 символов'; errEl.classList.remove('hidden'); return; }
    if (newPass !== confirmPass) { errEl.textContent = 'Пароли не совпадают'; errEl.classList.remove('hidden'); return; }

    DB.updateUser(u.id, { password: newPass });
    const updated = DB.getUsers().find(usr => usr.id === u.id);
    DB.setSession(updated);
    okEl.textContent = '✓ Пароль изменён!';
    okEl.classList.remove('hidden');
    document.getElementById('set-old-pass').value = '';
    document.getElementById('set-new-pass').value = '';
    document.getElementById('set-confirm-pass').value = '';
  });

  // Export DB
  document.getElementById('export-db')?.addEventListener('click', () => {
    const data = {
      users: DB.getUsers(),
      requests: DB.getRequests(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenleaf-db-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📤 Экспорт выполнен');
  });

  // Clear requests
  document.getElementById('clear-requests')?.addEventListener('click', () => {
    document.getElementById('confirm-title').textContent = 'Очистить все заявки?';
    document.getElementById('confirm-text').textContent = 'Все заявки будут удалены безвозвратно.';
    document.getElementById('confirm-ok').onclick = () => {
      localStorage.setItem('gl_requests', JSON.stringify([]));
      closeModal('modal-confirm');
      renderDashboard();
      showToast('🗑 Все заявки удалены');
    };
    openModal('modal-confirm');
  });

  // Reset DB
  document.getElementById('reset-db')?.addEventListener('click', () => {
    document.getElementById('confirm-title').textContent = 'Сброс базы данных?';
    document.getElementById('confirm-text').textContent = 'ВСЕ данные (пользователи, заявки) будут удалены. Вы выйдете из системы.';
    document.getElementById('confirm-ok').onclick = () => {
      localStorage.removeItem('gl_users');
      localStorage.removeItem('gl_requests');
      localStorage.removeItem('gl_session');
      window.location.href = 'index.html';
    };
    openModal('modal-confirm');
  });

  // ========== INITIAL RENDER ==========
  renderDashboard();
});

// ===== HELPERS =====
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusLabel(s) {
  return { new: '🔵 Новая', 'in-work': '🟡 В работе', done: '🟢 Выполнено' }[s] || s;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
