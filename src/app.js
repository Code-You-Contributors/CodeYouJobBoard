const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page at:
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for Google Sheets
app.get('/api/sheet', async (req, res) => {
  const spreadsheetId = process.env.XLSX_ID;
  const API_KEY = process.env.Google_API_KEY;

  console.log('Using API Key:', API_KEY ? 'Found' : 'Missing');
  console.log('Using Spreadsheet ID:', spreadsheetId ? 'Found' : 'Missing');

  // Dynamic range for the Sheets API. Currently, A:I are the in-use columns
  const range = encodeURIComponent(req.query.range || 'JobBoard!A:I');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=COLUMNS&key=${API_KEY}`;

  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Google Sheets API error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Error fetching Google Sheet' });
  }
});

app.listen(PORT, () => {
  console.log('Server started at http://localhost:' + PORT);
});