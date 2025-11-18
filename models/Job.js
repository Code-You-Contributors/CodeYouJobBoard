const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  Date: { type: Date, required: true },
  Employer: { type: String, required: true },
  'Job Title': { type: String, required: true },
  Pathway: { type: String, required: true },
  Language: [{ type: String }], // Array of strings
  'Salary Range': {
    min: { type: Number },
    max: { type: Number },
    avg: { type: Number }
  },
  'Contact Person': { type: String },
  Location: { type: String },
  'Deactivate?': { type: Boolean, default: false },
  Apply: { type: String }
}, { collection: 'jobs' }); // Specify collection name

module.exports = mongoose.model('Job', jobSchema);