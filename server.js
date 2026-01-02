const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  // Suppress common connection reset errors that are harmless
  if (error.code === 'ECONNRESET' || error.message === 'aborted') {
    // These are harmless connection resets from clients closing connections
    // Common in development with hot reloading and navigation
    return;
  }
  
  // Log other uncaught exceptions
  console.error('Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  // Suppress connection reset related rejections
  if (reason && (reason.code === 'ECONNRESET' || reason.message === 'aborted')) {
    return;
  }
  
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      // Handle connection reset errors gracefully
      if (err.code === 'ECONNRESET' || err.message === 'aborted') {
        // Client closed connection - this is normal and harmless
        return;
      }
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).once('error', (err) => {
    // Handle server-level connection errors
    if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
      return;
    }
    console.error('Server error:', err);
    process.exit(1);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

