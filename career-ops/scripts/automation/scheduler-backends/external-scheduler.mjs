/**
 * external-scheduler.mjs — External webhook scheduler backend
 *
 * Accepts external triggers via HTTP POST with HMAC-SHA256 signature validation.
 * Implements rate limiting to prevent abuse.
 * Useful for integrating with external services (Zapier, n8n, AWS Lambda, etc.)
 */

import crypto from 'crypto';
import http from 'http';
import { BaseScheduler } from './base-scheduler.mjs';

export class ExternalScheduler extends BaseScheduler {
  constructor(config) {
    super('external', config);
    this.server = null;
    this.requestCount = 0;
    this.rateLimitWindow = {};
  }

  /**
   * Validate external scheduler configuration
   * @returns {boolean} True if config is valid
   */
  validateConfig() {
    if (!this.config.webhook_secret) {
      throw new Error('config.schedulers.external.webhook_secret is required for HMAC validation');
    }

    if (this.config.rate_limit_per_hour && (
      typeof this.config.rate_limit_per_hour !== 'number' ||
      this.config.rate_limit_per_hour < 1
    )) {
      throw new Error('config.schedulers.external.rate_limit_per_hour must be a positive number');
    }

    return true;
  }

  /**
   * Start external scheduler webhook listener
   * @returns {Promise<void>}
   */
  async start() {
    try {
      this.validateConfig();

      this._startWebhookListener();
      this._setRunning(true);
      this._log('info', `External webhook scheduler started on path ${this.config.webhook_path}`);
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Stop external scheduler webhook listener
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve, reject) => {
      try {
        this._log('info', 'Stopping external webhook scheduler...');

        if (this.server) {
          this.server.close(() => {
            this._setRunning(false);
            this._log('info', 'External webhook scheduler stopped');
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        this._recordError(error);
        reject(error);
      }
    });
  }

  /**
   * Get current status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      name: this.name,
      running: this.running,
      type: 'external',
      path: this.config.webhook_path,
      requestCount: this.requestCount,
      rateLimitPerHour: this.config.rate_limit_per_hour || 'unlimited',
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  /**
   * Start webhook listener HTTP server
   * @private
   */
  _startWebhookListener() {
    this.server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === this.config.webhook_path) {
        // Collect request body
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          this._handleWebhookRequest(body, req, res);
        });
      } else if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getStatus()));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Webhook endpoint not found' }));
      }
    });

    this.server.listen(this.config.port || 3001, this.config.host || 'localhost', () => {
      this._log('info', `Webhook listener ready on http://${this.config.host || 'localhost'}:${this.config.port || 3001}${this.config.webhook_path}`);
    });

    this.server.on('error', (error) => {
      this._recordError(error);
      this._log('error', `Webhook server error: ${error.message}`);
    });
  }

  /**
   * Handle incoming webhook request
   * @private
   */
  _handleWebhookRequest(body, req, res) {
    try {
      // Check rate limit
      if (!this._checkRateLimit(req.socket.remoteAddress)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rate limit exceeded' }));
        this._log('warn', `Rate limit exceeded for ${req.socket.remoteAddress}`);
        return;
      }

      // Verify HMAC signature
      const signature = req.headers['x-webhook-signature'];
      if (!this._verifySignature(body, signature)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid signature' }));
        this._log('warn', `Invalid signature from ${req.socket.remoteAddress}`);
        return;
      }

      // Record successful trigger
      this.requestCount += 1;
      this._recordRun();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Automation cycle triggered',
        timestamp: new Date().toISOString(),
      }));

      this._log('info', `Valid webhook received from ${req.socket.remoteAddress}`);

      if (this.onTrigger) {
        this.onTrigger({
          backend: this.name,
          trigger: 'webhook',
          source: req.socket.remoteAddress,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this._recordError(error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
      this._log('error', `Webhook processing error: ${error.message}`);
    }
  }

  /**
   * Verify HMAC-SHA256 signature
   * @private
   */
  _verifySignature(body, signature) {
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha256', this.config.webhook_secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  /**
   * Check rate limit (token bucket algorithm)
   * @private
   */
  _checkRateLimit(clientIp) {
    const now = Date.now();
    const windowKey = clientIp;

    if (!this.rateLimitWindow[windowKey]) {
      this.rateLimitWindow[windowKey] = { count: 1, windowStart: now };
      return true;
    }

    const window = this.rateLimitWindow[windowKey];
    const timeSinceWindowStart = now - window.windowStart;
    const HOUR_MS = 3600000;

    // Reset window if hour has passed
    if (timeSinceWindowStart > HOUR_MS) {
      this.rateLimitWindow[windowKey] = { count: 1, windowStart: now };
      return true;
    }

    // Check if rate limit exceeded
    const limit = this.config.rate_limit_per_hour || 10;
    if (window.count >= limit) {
      return false;
    }

    window.count += 1;
    return true;
  }
}

export default ExternalScheduler;
