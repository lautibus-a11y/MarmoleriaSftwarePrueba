/* ========================================
   MARMOLERÍA BENJAMIN — Auth Service
   ======================================== */

const AUTH_KEY = 'mb_auth';

// Mock credentials for Phase 1
const MOCK_USER = {
  username: 'admin',
  password: 'admin123',
  name: 'Administrador',
  role: 'admin'
};

class AuthService {
  constructor() {
    this.user = null;
    this.loadSession();
  }

  loadSession() {
    try {
      const data = localStorage.getItem(AUTH_KEY);
      if (data) {
        this.user = JSON.parse(data);
      }
    } catch (e) {
      this.user = null;
    }
  }

  isAuthenticated() {
    return !!this.user;
  }

  getUser() {
    return this.user;
  }

  login(username, password) {
    // Phase 1: mock auth
    if (username === MOCK_USER.username && password === MOCK_USER.password) {
      this.user = {
        username: MOCK_USER.username,
        name: MOCK_USER.name,
        role: MOCK_USER.role,
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(this.user));
      return { success: true, user: this.user };
    }
    return { success: false, error: 'Usuario o contraseña incorrectos' };
  }

  logout() {
    this.user = null;
    localStorage.removeItem(AUTH_KEY);
  }
}

export const Auth = new AuthService();
