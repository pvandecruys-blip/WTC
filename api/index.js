// Vercel serverless entry — Express app is direct compatibel met Vercel's
// Node handler signature (req, res), dus geen wrapper nodig.
module.exports = require('../app');
