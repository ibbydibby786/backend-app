const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Basic route to confirm server is running
app.get('/', (req, res) => {
  res.send('Express server is up and running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
