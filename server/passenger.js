/**
 * Phusion Passenger Entry Point for cPanel / GoDaddy Shared Hosting.
 * 
 * Phusion Passenger manages Node.js processes in cPanel.
 * It sets process.env.PORT to a custom port or socket.
 * This entry point loads environment variables and boots the compiled Express app.
 */

require('dotenv').config();

// Ensure production NODE_ENV if not explicitly specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Load the compiled application entry point
const app = require('./dist/src/app').default || require('./dist/src/app');

// Phusion Passenger will manage the port automatically.
// If run directly via 'node passenger.js', fallback to process.env.PORT || 3001
const port = process.env.PORT || 3001;

if (typeof(PhusionPassenger) !== 'undefined') {
  // Passenger is handling process management
  console.log('[Passenger] DentalCore application running under Phusion Passenger.');
} else {
  console.log(`[Passenger] Running standalone on port ${port}.`);
}
