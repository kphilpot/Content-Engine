/**
 * Gemini.ai Bot
 * Automates Gemini (Google's AI) for research synthesis
 * Handles login, conversation, response extraction
 */

const MAX_RETRIES = 2;
const GEMINI_URL = 'https://gemini.google.com';

class GeminiBot {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Synthesize research by navigating Gemini and extracting responses
   * @param {string} prompt - The prompt to send to Gemini
   * @param {object} options - { temperature, maxTokens }
   * @returns {Promise<string>} - Gemini's response
   */
  async synthesize(prompt, options = {}) {
    let session = null;
    let retries = 0;

    while (retries <= MAX_RETRIES) {
      try {
        session = await this.sessionManager.getSession('gemini');
        const response = await this._synthesizeWithSession(session, prompt, options);

        // Save login state for next time
        await this.sessionManager.saveLoginState('gemini', session);

        // Return session to pool
        this.sessionManager.releaseSession('gemini', session);

        return response;
      } catch (error) {
        retries++;

        if (session) {
          // Close broken session
          try {
            await session.context.close();
            await session.browser.close();
          } catch {}
        }

        if (retries > MAX_RETRIES) {
          throw new Error(`Gemini synthesis failed after ${MAX_RETRIES} retries: ${error.message}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      }
    }
  }

  /**
   * Internal method: synthesize with a specific session
   */
  async _synthesizeWithSession(session, prompt, options = {}) {
    const { page } = session;

    // Navigate to Gemini
    await page.goto(GEMINI_URL, { waitUntil: 'networkidle' });

    // Check if we need to login
    const needsLogin = await page.locator('[aria-label="Sign in"]').isVisible().catch(() => false);

    if (needsLogin) {
      throw new Error('Gemini login required. Please ensure you are logged in before using this bot.');
    }

    // Wait for chat interface to load
    await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 10000 }).catch(() => {});

    // Find the message input (Gemini uses contenteditable div or textarea)
    let input = page.locator('[contenteditable="true"]').first();
    if (!await input.isVisible()) {
      input = page.locator('textarea').first();
    }

    if (!await input.isVisible()) {
      throw new Error('Chat input not found on Gemini interface');
    }

    // Click to focus
    await input.click();

    // Type the prompt
    await input.type(prompt, { delay: 10 });

    // Send message (look for Send button)
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendButton.click();

    // Wait for response
    const response = await this._waitForResponse(page);

    return response;
  }

  /**
   * Wait for Gemini's response and extract it
   */
  async _waitForResponse(page, timeout = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Gemini displays responses in specific message containers
        const messages = await page.locator('[role="article"]').all();

        if (messages.length >= 2) {
          // Get the last message (most recent response from Gemini)
          const lastMessage = messages[messages.length - 1];
          const text = await lastMessage.textContent();

          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }

        // Alternative: look for response text in specific containers
        const response = await page.locator('div[data-test-id*="response"], div[class*="response"]').last().textContent().catch(() => '');
        if (response && response.trim().length > 0) {
          return response.trim();
        }

        // Wait before checking again
        await page.waitForTimeout(1000);

      } catch (error) {
        console.error('Error checking for Gemini response:', error.message);
        await page.waitForTimeout(1000);
      }
    }

    throw new Error('Timeout waiting for Gemini response');
  }

  /**
   * Close all Gemini sessions
   */
  async close() {
    // Sessions are managed by SessionManager
  }
}

module.exports = GeminiBot;
