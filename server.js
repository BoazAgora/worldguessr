// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Gebruik de juiste poort (Render geeft deze zelf mee in process.env.PORT)
const port = process.env.PORT || 3001;
const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

// Route: alle landen ophalen
app.get('/allCountries.json', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'allCountries.json');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Error reading allCountries.json' });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  });
});

// Route: coördinaten per land
app.get('/countryLocations/:country', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'countryLocations', `${req.params.country}.json`);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(404).json({ error: 'Country not found' });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  });
});

// Proxy voorbeeld (indien frontend fetch gebruikt)
app.get('/api/allCountries', async (req, res) => {
  try {
    const response = await fetch(`${baseUrl}/allCountries.json`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch allCountries.json' });
  }
});

app.get('/api/countryLocations/:country', async (req, res) => {
  try {
    const response = await fetch(`${baseUrl}/countryLocations/${req.params.country}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch country location' });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`[INFO] API Server running on port ${port}`);
});
