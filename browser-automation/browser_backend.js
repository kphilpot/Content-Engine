/**
 * Browser Automation Backend
 * Express server exposing REST endpoints for browser automation
 * Provides /generate (Claude) and /synthesize (Gemini) endpoints
 */

const express = require('express');
const SessionManager = require('./session_manager');
const ClaudeAIBot = require('./claude_ai_bot');
const GeminiBot = require('./gemini_bot');

const PORT = process.env.BROWSER_BACKEND_PORT || 3000;
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));

// Initialize session manager and bots
const sessionManager = new SessionManager({
  maxSessions: parseInt(process.env.MAX_BROWSER_SESSIONS || '3'),
  headless: process.env.HEADLESS !== 'false'
});

const claudeBot = new ClaudeAIBot(sessionManager);
const geminiBot = new GeminiBot(sessionManager);

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessionStats: sessionManager.getStats()
  });
});

/**
 * Generate content using Claude.ai
 * POST /generate
 * Body: { prompt, options: { model, temperature, maxTokens, ... } }
 * Returns: { content, tokensUsed, generatedAt }
 */
app.post('/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    console.log(`[GENERATE] Starting Claude generation for prompt (${prompt.length} chars)`);

    const startTime = Date.now();
    const content = await claudeBot.generate(prompt, options);
    const duration = Date.now() - startTime;

    console.log(`[GENERATE] Completed in ${duration}ms, response: ${content.length} chars`);

    res.json({
      success: true,
      service: 'claude',
      content,
      promptLength: prompt.length,
      contentLength: content.length,
      generationTime: duration,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[GENERATE] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'claude'
    });
  }
});

/**
 * Synthesize research using Gemini.ai
 * POST /synthesize
 * Body: { prompt, options: { temperature, maxTokens, ... } }
 * Returns: { synthesis, generatedAt }
 */
app.post('/synthesize', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing required field: prompt' });
    }

    console.log(`[SYNTHESIZE] Starting Gemini synthesis for prompt (${prompt.length} chars)`);

    const startTime = Date.now();
    const synthesis = await geminiBot.synthesize(prompt, options);
    const duration = Date.now() - startTime;

    console.log(`[SYNTHESIZE] Completed in ${duration}ms, response: ${synthesis.length} chars`);

    res.json({
      success: true,
      service: 'gemini',
      synthesis,
      promptLength: prompt.length,
      synthesisLength: synthesis.length,
      generationTime: duration,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SYNTHESIZE] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      service: 'gemini'
    });
  }
});

/**
 * Get session pool statistics
 */
app.get('/stats', (req, res) => {
  res.json({
    sessionStats: sessionManager.getStats(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Closing browser sessions...');
  try {
    await sessionManager.closeAll();
    console.log('[SHUTDOWN] All sessions closed');
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN] Error closing sessions:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Closing browser sessions...');
  try {
    await sessionManager.closeAll();
    console.log('[SHUTDOWN] All sessions closed');
    process.exit(0);
  } catch (error) {
    console.error('[SHUTDOWN] Error closing sessions:', error);
    process.exit(1);
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`\n🤖 Browser Automation Backend Ready`);
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   /generate - POST Claude.ai content generation`);
  console.log(`   /synthesize - POST Gemini.ai research synthesis`);
  console.log(`   /health - GET server health`);
  console.log(`   /stats - GET session statistics`);
  console.log(`\n   Waiting for requests...`);
});

module.exports = app;
