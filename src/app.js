/**
 * @file app.js
 * @description
 * Main server file for the Code:YouJobBoard project.
 * Sets up an Express server to serve static files and provide
 * an API endpoint that retrieves job data from a Google Sheet.
 *
 * @requires express
 * @requires path
 * @requires axios
 * @requires dotenv
 */

const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

/**
 * Create an Express application instance.
 * @type {import('express').Express}
 */
const app = express();

/**
 * Port configuration for the server.
 * Uses environment variable `PORT` if available,
 * otherwise defaults to 3000.
 * @constant {number}
 */
const PORT = process.env.PORT || 3000;

/**
 * Middleware for serving static files.
 * Serves all files from the `public` directory.
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET /
 * @description
 * Serves the main landing page of the YouJobBoard app.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {void}
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /api/sheet
 * @description
 * Fetches job data from a Google Sheet using the Google Sheets API.
 * 
 * The following environment variables must be configured in the `.env` file:
 * - `XLSX_ID`: The Google Spreadsheet ID.
 * - `Google_API_KEY`: Your Google Sheets API key.
 * 
 * The request can optionally include a query parameter `range`
 * to specify a custom range (default: `JobBoard!A:I`).
 *
 * Example usage:
 * ```
 * GET /api/sheet
 * GET /api/sheet?range=Sheet1!A:D
 * ```
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>} Sends JSON data from the Google Sheets API response.
 */
app.get('/api/sheet', async (req, res) => {
  const spreadsheetId = process.env.XLSX_ID;
  const API_KEY = process.env.Google_API_KEY;

  console.log('Using API Key:', API_KEY ? 'Found' : 'Missing');
  console.log('Using Spreadsheet ID:', spreadsheetId ? 'Found' : 'Missing');

  // Dynamic range for the Sheets API — A:I are currently used columns.
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

/**
 * Starts the Express server.
 * Logs a confirmation message with the local server URL.
 */
app.listen(PORT, () => {
  console.log(`✅ Server started at http://localhost:${PORT}`);
});
