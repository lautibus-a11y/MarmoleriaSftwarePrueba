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
      const data = localStorage.getItem(AUTH_KEY);
      if (data) {
        this.user = JSON.parse(data);
      } else {
        this.user = DEFAULT_USER;
      }
    } catch (e) {
      this.user = DEFAULT_USER;
    }
  }

  isAuthenticated() {
    return true;
  }

  getUser() {
    return this.user || DEFAULT_USER;
  }

  login(username, password) {
    return { success: true, user: this.user };
  }

  logout() {
    this.user = DEFAULT_USER;
  }
}

export const Auth = new AuthService();

