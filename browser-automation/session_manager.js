const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Session Manager
 * Handles browser instance pooling, login, and session persistence
 * Reduces overhead of launching new browser instances for each request
 */

class SessionManager {
  constructor(options = {}) {
    this.maxSessions = options.maxSessions || 3;
    this.sessions = new Map(); // service -> pool of sessions
    this.loginStates = new Map(); // service -> localStorage/cookies cache
    this.options = {
      headless: options.headless !== false,
      timeout: options.timeout || 30000,
      ...options
    };
  }

  /**
   * Get or create a session for a service (claude, chatgpt, gemini)
   */
  async getSession(service) {
    if (!this.sessions.has(service)) {
      this.sessions.set(service, []);
    }

    const pool = this.sessions.get(service);

    // Return existing idle session if available
    if (pool.length > 0) {
      const session = pool.pop();
      if (await this._validateSession(session)) {
        return session;
      } else {
        // Session is stale, close it
        await session.context.close();
        await session.browser.close();
      }
    }

    // Create new session if under limit
    if (pool.length < this.maxSessions) {
      return await this._createSession(service);
    }

    // Wait for a session to become available (timeout after 5 minutes)
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (pool.length > 0) {
          clearInterval(checkInterval);
          resolve(pool.pop());
        } else if (Date.now() - startTime > 300000) {
          clearInterval(checkInterval);
          reject(new Error(`Session timeout waiting for ${service} session`));
        }
      }, 1000);
    });
  }

  /**
   * Return session to pool
   */
  releaseSession(service, session) {
    if (!this.sessions.has(service)) {
      this.sessions.set(service, []);
    }
    this.sessions.get(service).push(session);
  }

  /**
   * Create a new browser session
   */
  async _createSession(service) {
    const browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-first-run'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    // Load stored login state if available
    const loginState = this.loginStates.get(service);
    if (loginState) {
      if (loginState.cookies) {
        await context.addCookies(loginState.cookies);
      }
      if (loginState.localStorage) {
        const page = await context.newPage();
        for (const [key, value] of Object.entries(loginState.localStorage)) {
          await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
        }
        await page.close();
      }
    }

    const page = await context.newPage();
    page.setDefaultTimeout(this.options.timeout);

    return {
      browser,
      context,
      page,
      service,
      createdAt: Date.now()
    };
  }

  /**
   * Validate session is still alive
   */
  async _validateSession(session) {
    try {
      // Try to evaluate something simple to check if page is still responsive
      await session.page.evaluate(() => true);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Store login state for a service
   */
  async saveLoginState(service, session) {
    const cookies = await session.context.cookies();
    const localStorage = await session.page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });

    this.loginStates.set(service, { cookies, localStorage });
  }

  /**
   * Close all sessions and cleanup
   */
  async closeAll() {
    for (const [service, pool] of this.sessions.entries()) {
      for (const session of pool) {
        try {
          await session.context.close();
          await session.browser.close();
        } catch (err) {
          console.error(`Error closing ${service} session:`, err.message);
        }
      }
    }
    this.sessions.clear();
    this.loginStates.clear();
  }

  /**
   * Get pool stats for monitoring
   */
  getStats() {
    const stats = {};
    for (const [service, pool] of this.sessions.entries()) {
      stats[service] = {
        active: pool.length,
        maxSessions: this.maxSessions
      };
    }
    return stats;
  }
}

module.exports = SessionManager;
