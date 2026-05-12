/**
 * session-manager.mjs — Session state management
 *
 * Tracks active automation sessions and prevents concurrent runs.
 * Maintains persistent state in config file.
 */

import { randomUUID } from 'crypto';

export class SessionManager {
  constructor(configPath = 'config/profile.yml') {
    this.configPath = configPath;
    this.currentSession = null;
  }

  /**
   * Create new session
   * @returns {string} Session ID (UUID v4)
   */
  createSession() {
    if (this.currentSession) {
      throw new Error('Session already active');
    }

    const sessionId = `session-${randomUUID()}`;
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      actions: {},
    };

    console.log(`📋 Session created: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get active session ID
   * @returns {string|null} Session ID or null if no active session
   */
  getActiveSessionId() {
    return this.currentSession?.id || null;
  }

  /**
   * Record action completion
   * @param {string} actionName - Action name (scan, batch, form-fill, notify)
   * @param {Object} result - Action result
   */
  recordAction(actionName, result) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.actions[actionName] = {
      timestamp: new Date(),
      result,
    };

    console.log(`✅ ${actionName} recorded in session ${this.currentSession.id}`);
  }

  /**
   * Get session summary
   * @returns {Object} Session data
   */
  getSessionSummary() {
    if (!this.currentSession) {
      return null;
    }

    return {
      id: this.currentSession.id,
      startTime: this.currentSession.startTime,
      duration: ((Date.now() - this.currentSession.startTime) / 1000).toFixed(2),
      actions: this.currentSession.actions,
    };
  }

  /**
   * End session
   * @returns {Object} Final session summary
   */
  endSession() {
    if (!this.currentSession) {
      return null;
    }

    const summary = this.getSessionSummary();
    this.currentSession = null;

    console.log(`🏁 Session ended: ${summary.id} (${summary.duration}s)`);
    return summary;
  }
}

export default SessionManager;
