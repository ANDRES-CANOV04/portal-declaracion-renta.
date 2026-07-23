/**
 * Main Application Orchestrator con Registro de Clientes Reales y Soporte PWA
 */
import { renderAdminPortal } from './admin.js';
import { getCurrentUser, login, logout, switchDemoUser } from './auth.js';
import { renderClientPortal, showUploadModalForUser } from './client.js';
import { createNewClient, findUserByEmail, getStore, updateUserProfile } from './store.js';

// Expose global helpers to window for easy modal triggers
window.showUploadModalForUser = showUploadModalForUser;
window.switchDemoAccount = (userId) => {
  const user = switchDemoUser(userId);
  if (user) {
    showToast(`Sesión cambiada a: ${user.name}`, 'info');
    renderApp();
  }
};

window.showToast = showToast;
window.renderApp = renderApp;

let currentView = 'home'; // Default view set to Home / Main Portal
let inactivityTimer = null;
const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos de inactividad
let deferredPwaPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  setupInactivityTracker();
  setupPWAInstaller();
  setupNavTabs();
  renderApp();
});

function setupNavTabs() {
  const btnHome = document.getElementById('nav-tab-home');
  const brandHome = document.getElementById('nav-brand-home');

  if (btnHome) {
    btnHome.addEventListener('click', () => {
      currentView = 'home';
      renderApp();
    });
  }

  if (brandHome) {
    brandHome.addEventListener('click', () => {
      currentView = 'home';
      renderApp();
    });
  }
}

function setupPWAInstaller() {
  const pwaBanner = document.getElementById('pwa-install-banner');
  const btnInstall = document.getElementById('btn-pwa-install');
  const btnDismiss = document.getElementById('btn-pwa-dismiss');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (pwaBanner) pwaBanner.classList.remove('hidden');
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('¡Gracias por instalar la App de TaxPortal!', 'success');
        }
        deferredPwaPrompt = null;
        if (pwaBanner) pwaBanner.classList.add('hidden');
      } else {
        showToast('Para instalar en iPhone/iPad, abre en Safari y presiona "Compartir > Agregar a inicio".', 'info');
      }
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      if (pwaBanner) pwaBanner.classList.add('hidden');
    });
  }
}

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  const currentUser = getCurrentUser();
  if (currentUser) {
    inactivityTimer = setTimeout(() => {
      logout();
      if (window.showToast) {
        window.showToast('⚠️ Sesión cerrada por inactividad. Por favor inicia sesión nuevamente.', 'error');
      }
      renderApp();
    }, INACTIVITY_LIMIT_MS);
  }
}

function setupInactivityTracker() {
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
}

export function renderApp() {
  const currentUser = getCurrentUser();
  const mainAppContainer = document.getElementById('main-app-content');
  const navUserSection = document.getElementById('nav-user-section');
  const btnHome = document.getElementById('nav-tab-home');

  if (btnHome) {
    btnHome.classList.add('active');
  }

  // Update Nav User Badge if logged in
  if (currentUser) {
    navUserSection.innerHTML = `
      <div class="user-profile-widget">
        <div class="avatar">${getUserInitials(currentUser.name)}</div>
        <div>
          <div style="font-size: 0.85rem; font-weight: 700; line-height: 1.1;">${currentUser.name}</div>
          <div class="text-xs" style="color: var(--text-muted);">${currentUser.role === 'admin' ? 'Contador Administrador' : 'Contribuyente'}</div>
        </div>
        <button id="btn-app-logout" class="btn-icon" style="margin-left: 0.5rem;" title="Cerrar Sesión">
          🚪
        </button>
      </div>
    `;

    document.getElementById('btn-app-logout').addEventListener('click', () => {
      logout();
      showToast('Sesión cerrada correctamente.', 'info');
      renderApp();
    });
  } else {
    navUserSection.innerHTML = `
      <button onclick="renderLoginView(document.getElementById('main-app-content'))" class="btn btn-secondary text-xs">
        🔑 Iniciar Sesión
      </button>
    `;
  }

  // Handle Main Views: Login, Admin Portal, or Client Portal
  if (!currentUser) {
    renderLoginView(mainAppContainer);
  } else if (currentUser.role === 'admin') {
    renderAdminPortal(mainAppContainer, currentUser);
  } else {
    renderClientPortal(mainAppContainer, currentUser);
  }
}

function renderLoginView(container) {
  container.innerHTML = `
    <div class="login-view">
      <div class="login-card-wrapper" style="max-width: 440px;">
        <div class="card" style="padding: 2.25rem;">
          <div class="login-header-logo">
            <div class="icon-box" style="background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: #09090b; box-shadow: 0 4px 18px rgba(212, 175, 55, 0.4);">⚜️</div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: #ffffff;">Portal Declaración de Renta</h2>
            <p style="font-size: 0.88rem; color: var(--text-muted); margin-top: 0.25rem;">
              Ingresa con tus credenciales para consultar el estado de tu trámite y descargar borradores DIAN.
            </p>
          </div>

          <form id="form-login-app" autocomplete="off">
            <div class="form-group">
              <label class="form-label">Correo Electrónico</label>
              <input type="email" id="login-email-input" class="form-input" placeholder="ej. usuario@ejemplo.com" autocomplete="off" value="" required />
            </div>

            <div class="form-group">
              <div class="flex justify-between items-center" style="margin-bottom: 0.4rem;">
                <label class="form-label" style="margin-bottom: 0;">Contraseña</label>
                <a href="#" id="btn-forgot-password" class="text-xs" style="color: #60a5fa; text-decoration: none;">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input type="password" id="login-pass-input" class="form-input" placeholder="Ingresa tu contraseña..." autocomplete="new-password" value="" required />
            </div>

            <button type="submit" class="btn btn-primary w-full" style="margin-top: 0.5rem; padding: 0.75rem;">
              Ingresar al Portal
            </button>
          </form>

          <div style="margin-top: 1.5rem; text-align: center; font-size: 0.85rem;">
            ¿Eres contribuyente y aún no estás registrado? <br>
            <a href="#" id="btn-client-register" style="color: #10b981; font-weight: 700; text-decoration: none;">
              ✨ Crear mi cuenta de cliente aquí
            </a>
          </div>

          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color); text-align: center;">
            <span class="text-xs" style="color: var(--text-muted);">
              🔒 Acceso Seguro para Contribuyentes y Contador Público
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Handle Login form submit
  const loginForm = container.querySelector('#form-login-app');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = container.querySelector('#login-email-input').value;
    const pass = container.querySelector('#login-pass-input').value;

    const res = login(email, pass);
    if (res.success) {
      showToast(`¡Bienvenido, ${res.user.name}!`, 'success');
      renderApp();
    } else {
      showToast(res.message, 'error');
    }
  });

  // Handle Register link
  const registerBtn = container.querySelector('#btn-client-register');
  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showClientRegisterModal();
    });
  }

  // Handle Forgot Password link
  const forgotBtn = container.querySelector('#btn-forgot-password');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotPasswordModal();
    });
  }
}

function showClientRegisterModal() {
  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">✨ Registro de Contribuyente</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-register-client">
      <div class="form-group">
        <label class="form-label">Nombre Completo</label>
        <input type="text" id="reg-name" class="form-input" placeholder="ej. María Camila Rodríguez" required />
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">NIT o Cédula</label>
          <input type="text" id="reg-nit" class="form-input" placeholder="ej. 1.020.304.050" required />
        </div>
        <div class="form-group">
          <label class="form-label">Teléfono de Contacto</label>
          <input type="text" id="reg-phone" class="form-input" placeholder="+57 310 000 0000" required />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Correo Electrónico (Login)</label>
          <input type="email" id="reg-email" class="form-input" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Crea tu Contraseña</label>
          <input type="password" id="reg-pass" class="form-input" placeholder="••••••••" required minlength="4" />
        </div>
      </div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-reg">Cancelar</button>
        <button type="submit" class="btn btn-emerald text-sm">Completar Registro</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-reg').addEventListener('click', close);

  const form = modalBox.querySelector('#form-register-client');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = modalBox.querySelector('#reg-name').value.trim();
    const nit = modalBox.querySelector('#reg-nit').value.trim();
    const phone = modalBox.querySelector('#reg-phone').value.trim();
    const email = modalBox.querySelector('#reg-email').value.trim();
    const password = modalBox.querySelector('#reg-pass').value.trim();

    if (findUserByEmail(email)) {
      showToast('Ya existe una cuenta registrada con este correo electrónico.', 'error');
      return;
    }

    const newClient = createNewClient({ name, nit, phone, email, password, year: '2025' });
    close();
    showToast(`¡Cuenta creada con éxito! Iniciando sesión como ${newClient.name}`, 'success');

    // Auto login as new client
    login(email, password);
    renderApp();
  });
}

function showForgotPasswordModal() {
  const modalOverlay = document.getElementById('app-modal-overlay');
  const modalBox = document.getElementById('app-modal-box');

  modalBox.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">🔐 Recuperar Contraseña</div>
      <button class="btn-icon" id="btn-close-modal">✕</button>
    </div>
    <form id="form-forgot-pass">
      <p class="text-sm" style="color: var(--text-muted); margin-bottom: 1.25rem;">
        Ingresa tu correo electrónico registrado para restablecer tu acceso al portal.
      </p>

      <div class="form-group">
        <label class="form-label">Correo Electrónico Registrado</label>
        <input type="email" id="forgot-email-input" class="form-input" placeholder="ej. usuario@ejemplo.com" required />
      </div>

      <div id="forgot-pass-result" class="hidden" style="margin-bottom: 1rem;"></div>

      <div class="flex justify-between items-center" style="margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary text-sm" id="btn-cancel-forgot">Cancelar</button>
        <button type="submit" class="btn btn-primary text-sm" id="btn-submit-forgot">Buscar Usuario</button>
      </div>
    </form>
  `;

  modalOverlay.classList.add('active');

  const close = () => modalOverlay.classList.remove('active');
  modalBox.querySelector('#btn-close-modal').addEventListener('click', close);
  modalBox.querySelector('#btn-cancel-forgot').addEventListener('click', close);

  const form = modalBox.querySelector('#form-forgot-pass');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = modalBox.querySelector('#forgot-email-input').value.trim();
    const user = findUserByEmail(emailInput);
    const resultBox = modalBox.querySelector('#forgot-pass-result');
    const submitBtn = modalBox.querySelector('#btn-submit-forgot');

    if (!user) {
      resultBox.className = '';
      resultBox.innerHTML = `
        <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem;">
          ❌ No se encontró ningún usuario registrado con el correo <strong>${emailInput}</strong>.
        </div>
      `;
      return;
    }

    resultBox.className = '';
    resultBox.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.85rem; margin-bottom: 1rem;">
        ✅ Usuario verificado: <strong>${user.name}</strong> (${user.role === 'admin' ? 'Contador Administrador' : 'Contribuyente'})
      </div>
      <div class="form-group">
        <label class="form-label">Escribe tu Nueva Contraseña</label>
        <input type="password" id="reset-new-pass-input" class="form-input" placeholder="Nueva contraseña..." required minlength="4" />
      </div>
    `;

    submitBtn.textContent = 'Restablecer Mi Contraseña';

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const newPass = newForm.querySelector('#reset-new-pass-input').value.trim();
      if (newPass) {
        updateUserProfile(user.id, { password: newPass });
        close();
        if (window.showToast) window.showToast('Contraseña restablecida con éxito. Puedes ingresar ahora.', 'success');
      }
    });

    newForm.querySelector('#btn-cancel-forgot').addEventListener('click', close);
  });
}

function getUserInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('app-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'app-toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️')}</span>
    <div>${message}</div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
