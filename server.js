const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  ✓ WTC Platte Band draait op http://localhost:${PORT}\n`);
});
