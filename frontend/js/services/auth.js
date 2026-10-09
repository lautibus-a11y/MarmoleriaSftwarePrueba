/* ========================================
   MARMOLERÍA BENJAMIN — Auth Service
   ======================================== */

const AUTH_KEY = 'mb_auth';

const DEFAULT_USER = {
  username: 'admin',
  name: 'Administrador',
  role: 'admin'
};

class AuthService {
  constructor() {
    this.user = DEFAULT_USER;
    this.loadSession();
  }

  loadSession() {
    try {
      // Limpiamos el localStorage viejo por si quedó guardado
      localStorage.removeItem(AUTH_KEY);
      
      const data = sessionStorage.getItem(AUTH_KEY);
      this.isLoggedIn = data === 'true';
    } catch (e) {
      this.isLoggedIn = false;
    }
  }

  isAuthenticated() {
    return this.isLoggedIn;
  }

  getUser() {
    return DEFAULT_USER;
  }

  // Función de hash simple para no dejar la contraseña en texto plano
  _hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  login(password) {
    // Hash de la contraseña esperada.
    // Hash de "leilabenjamin" = 3784978336
    const EXPECTED_HASH = 3784978336; 

    if (this._hash(password) === EXPECTED_HASH) {
      this.isLoggedIn = true;
      sessionStorage.setItem(AUTH_KEY, 'true');
      return true;
    }
    return false;
  }

  logout() {
    this.isLoggedIn = false;
    sessionStorage.removeItem(AUTH_KEY);
  }
}

export const Auth = new AuthService();

