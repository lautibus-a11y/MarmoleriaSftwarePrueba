export function renderLogin(container) {
  // Adding custom styles for a premium login feel
  const style = document.createElement('style');
  style.innerHTML = `
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100%;
      flex: 1;
      background: #f4f4f5; /* Light grey/white background */
      font-family: var(--font-family, 'Inter', system-ui, sans-serif);
    }
    .login-card {
      background: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 12px;
      padding: 48px 40px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      animation: fadeInUp 0.6s ease-out forwards;
      opacity: 0;
      transform: translateY(20px);
    }
    @keyframes fadeInUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .login-title {
      font-size: 26px;
      font-weight: 800;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }
    .login-subtitle {
      font-size: 13px;
      color: #71717a;
      margin-bottom: 32px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }
    .login-input-group {
      margin-bottom: 24px;
      text-align: left;
    }
    .login-input-label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: #18181b;
      font-weight: 600;
    }
    .login-input {
      width: 100%;
      padding: 14px 16px;
      background: #ffffff;
      border: 1px solid #d4d4d8;
      border-radius: 8px;
      color: #000000;
      font-size: 16px;
      transition: all 0.2s ease;
      outline: none;
    }
    .login-input:focus {
      border-color: #000000;
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
    }
    .login-input::placeholder {
      color: #a1a1aa;
    }
    .login-btn {
      width: 100%;
      padding: 14px;
      background: #000000;
      color: #ffffff;
      border: 2px solid #000000;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .login-btn:hover {
      background: #ffffff;
      color: #000000;
    }
    .login-btn:active {
      transform: translateY(1px);
    }
    .login-error {
      color: #ef4444;
      font-size: 14px;
      margin-bottom: 20px;
      display: none;
      background: #fef2f2;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #fecaca;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-5px); }
      40% { transform: translateX(5px); }
      60% { transform: translateX(-5px); }
      80% { transform: translateX(5px); }
    }
    .shake {
      animation: shake 0.4s ease-in-out;
    }
  `;
  document.head.appendChild(style);

  container.innerHTML = `
    <div class="login-container">
      <div class="login-card">
        <h1 class="login-title">MARMOLERÍA BENJAMIN</h1>
        <p class="login-subtitle">Sistema Administrativo</p>
        
        <form id="login-form">
          <div class="login-input-group">
            <label class="login-input-label">Contraseña de acceso</label>
            <input type="password" id="login-password" class="login-input" placeholder="••••••••••••" required autofocus autocomplete="current-password">
          </div>
          <div id="login-error" class="login-error">
            Contraseña incorrecta. Por favor, intente nuevamente.
          </div>
          <button type="submit" class="login-btn">
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('login-password').value;
    
    // Importamos dinámicamente Auth para evitar dependencias circulares complejas acá
    import('../services/auth.js').then(({ Auth }) => {
      if (Auth.login(pass)) {
        // Añadir efecto de salida
        const card = document.querySelector('.login-card');
        card.style.transition = 'all 0.4s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
          window.location.hash = '#/dashboard';
          window.location.reload();
        }, 400);
      } else {
        const errEl = document.getElementById('login-error');
        errEl.style.display = 'block';
        
        const card = document.querySelector('.login-card');
        card.classList.remove('shake');
        // Forzar reflow para reiniciar la animación
        void card.offsetWidth;
        card.classList.add('shake');
        
        const inp = document.getElementById('login-password');
        inp.value = '';
        inp.focus();
      }
    });
  });
}
