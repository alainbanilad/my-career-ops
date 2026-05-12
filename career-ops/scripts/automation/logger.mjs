import fs from 'fs';
import path from 'path';

const LOG_DIR = 'logs/automation';
const LOG_FILE = path.join(LOG_DIR, 'automation.log');

function write(level, message, context = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  fs.appendFileSync(LOG_FILE, JSON.stringify(record) + '\n');
}

export const logger = {
  debug: (message, context = {}) => write('debug', message, context),
  info: (message, context = {}) => write('info', message, context),
  warn: (message, context = {}) => write('warn', message, context),
  error: (message, context = {}) => write('error', message, context),
};

export default logger;
