/**
 * Claude.ai Bot
 * Automates Claude.ai to generate content
 * Handles login, multi-turn conversations, response extraction
 */

const MAX_RETRIES = 2;
const CLAUDE_URL = 'https://claude.ai';

class ClaudeAIBot {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Generate content by navigating Claude.ai and extracting responses
   * @param {string} prompt - The prompt to send to Claude
   * @param {object} options - { model, temperature, maxTokens, conversationHistory }
   * @returns {Promise<string>} - Claude's response
   */
  async generate(prompt, options = {}) {
    let session = null;
    let retries = 0;

    while (retries <= MAX_RETRIES) {
      try {
        session = await this.sessionManager.getSession('claude');
        const response = await this._generateWithSession(session, prompt, options);

        // Save login state for next time
        await this.sessionManager.saveLoginState('claude', session);

        // Return session to pool
        this.sessionManager.releaseSession('claude', session);

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
          throw new Error(`Claude.ai generation failed after ${MAX_RETRIES} retries: ${error.message}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      }
    }
  }

  /**
   * Internal method: generate with a specific session
   */
  async _generateWithSession(session, prompt, options = {}) {
    const { page } = session;

    // Navigate to Claude.ai
    await page.goto(CLAUDE_URL, { waitUntil: 'networkidle' });

    // Check if we need to login (look for login button)
    const needsLogin = await page.locator('[data-testid="login-button"]').isVisible().catch(() => false);

    if (needsLogin) {
      await this._handleLogin(page);
    }

    // Wait for chat interface to load
    await page.waitForSelector('textarea[placeholder*="Message"]', { timeout: 10000 }).catch(() => {});

    // Find the message input
    const textarea = page.locator('textarea[placeholder*="Message"]').first();

    if (!await textarea.isVisible()) {
      throw new Error('Chat input not found or not visible');
    }

    // Clear any existing text
    await textarea.click();
    await textarea.fill('');

    // Type the prompt (using type for realistic behavior)
    await textarea.type(prompt, { delay: 10 });

    // Send message
    const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await sendButton.click();

    // Wait for response
    const response = await this._waitForResponse(page);

    return response;
  }

  /**
   * Wait for Claude's response and extract it
   */
  async _waitForResponse(page, timeout = 60000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Get all message divs (Claude's responses are in specific containers)
        const messages = await page.locator('[data-testid="assistant-message"]').all();

        if (messages.length > 0) {
          // Get the last message (most recent response)
          const lastMessage = messages[messages.length - 1];
          const text = await lastMessage.textContent();

          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }

        // Alternative: look for message containers by role
        const lastMsg = await page.locator('div[role="article"]').last().textContent().catch(() => '');
        if (lastMsg && lastMsg.trim().length > 0) {
          return lastMsg.trim();
        }

        // Wait a bit before checking again
        await page.waitForTimeout(1000);

      } catch (error) {
        console.error('Error checking for response:', error.message);
        await page.waitForTimeout(1000);
      }
    }

    throw new Error('Timeout waiting for Claude response');
  }

  /**
   * Handle Claude.ai login if needed
   */
  async _handleLogin(page) {
    console.log('Claude.ai login required - please provide credentials');

    // For automated login, you would need to:
    // 1. Click login button
    // 2. Wait for email input
    // 3. Type email
    // 4. Click continue
    // 5. Type password
    // 6. Click login

    // For now, we throw an error and let the user know manual login might be needed
    throw new Error('Claude.ai login required. Please ensure you are logged in before using this bot.');
  }

  /**
   * Close all Claude sessions
   */
  async close() {
    // Sessions are managed by SessionManager
  }
}

module.exports = ClaudeAIBot;
