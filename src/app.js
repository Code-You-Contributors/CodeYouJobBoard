/**
 * @file app.js
 * @description
 * Main server file for the Code:YouJobBoard project.
 * Sets up an Express server to serve static files and provide
 * an API endpoint that retrieves job data from MongoDB via Mongoose.
 *
 * @requires express
 * @requires path
 * @requires mongoose
 * @requires dotenv
 */

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();
const axios = require('axios');

// Import the Job model
const Job = require('../models/Job');

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
 * MongoDB connection using Mongoose.
 * Connects to the URI from environment variables.
 */
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB via Mongoose'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

/**
 * Middleware for serving static files.
 * Serves all files from the `public` directory.
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

/**
 * GET /
 * @description
 * Serves the main landing page of the YouJobBoard app.
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/**
 * GET /api/sheet
 * @description
 * Fetches job data from MongoDB via Mongoose and returns it in a format similar to the Google Sheets API.
 * Filters out deactivated jobs.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>} Sends JSON data from MongoDB.
 */
app.get('/api/sheet', async (req, res) => {
  try {

    const jobs = await Job.find().lean();


    // Transform to match expected format (array of arrays, like Google Sheets)
    const headers = ['Date', 'Employer', 'Job Title', 'Pathway', 'Language', 'Salary Range', 'Contact Person', 'Location', 'Deactivate?', 'Apply'];
    const rows = jobs.map(job => [
      job['Date'] ? job['Date'].toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '',
      job['Employer'] || '',
      job['Job Title'] || '',
      job['Pathway'] || '',
      job['Language'] ? job['Language'].join(', ') : '',
      job['Salary Range']
        ? `$${job['Salary Range'].min || 0} - $${job['Salary Range'].max || job['Salary Range'].min || 0}`
        : '',
      job['Contact Person'] || '',
      job['Location'] || '',
      job['Deactivate?'] ? 'TRUE' : 'FALSE',
      job['Apply'] || ''
    ]);

    // Return in Google Sheets-like format
    res.json({
      values: [headers, ...rows],
      majorDimension: 'ROWS'
    });

  } catch (error) {
    console.error('Mongoose error:', error);
    res.status(500).json({ error: 'Error fetching data from MongoDB' });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const {
      employer,
      jobTitle,
      pathway,
      language,
      salaryRange,
      contactPerson,
      location,
      apply
    } = req.body;

    // Parse salary "$70,000 - $90,000" into min/max/avg like dashboard/jobBoard do
    let min = null, max = null, avg = null;
    if (salaryRange) {
      const parts = salaryRange.replace(/[$,]/g, '').split('-');
      min = parseFloat(parts[0]?.trim()) || null;
      if (parts.length > 1) {
        max = parseFloat(parts[1]?.trim()) || null;
      }
      if (min != null) {
        avg = (min + (max || min)) / 2;
      }
    }

    const job = new Job({
      Date: new Date(),                       // use "now" as posted date
      Employer: employer,
      'Job Title': jobTitle,
      Pathway: pathway,
      Language: String(language)
        .split(',')
        .map(l => l.trim())
        .filter(Boolean),
      'Salary Range': { min, max, avg },
      'Contact Person': contactPerson || '',
      Location: location || '',
      'Deactivate?': false,
      Apply: apply
    });

    await job.save();

    // Submit to Google Sheets
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbzwlPYcOFv6npeUz4K3mSQwCcKRRhDemaHcsHCFRbXSFvri25zwI1WaVTH8EXqz_WU2ug/exec';

    try {
      await axios.post(googleScriptUrl, new URLSearchParams({
        employer,
        jobTitle,
        pathway,
        language,
        salaryRange,
        contactPerson,
        location,
        apply
      }).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      console.log('✅ Submitted to Google Sheets');
    } catch (sheetErr) {
      console.error('❌ Error submitting to Google Sheets:', sheetErr.message);
      // We don't fail the request if this fails, as MongoDB save was successful
    }

    res.status(201).json({ success: true, message: 'Job submitted successfully' });
  } catch (err) {
    console.error('Error saving job:', err);
    res.status(500).send('Error saving job');
  }
});

/**
 * Starts the Express server.
 */
app.listen(PORT, () => {
  console.log(`✅ Server started at http://localhost:${PORT}`);
});