const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // temporary local storage for CSV

const router = express.Router();

// Import controllers
const { createCampaign, getJobs } = require('../controller/campaignController');

// Create Campaign Route
router.post('/api/create-campaign', upload.single('prospectsCsv'), createCampaign);

// Route: Jobs
router.get('/api/jobs', getJobs);

module.exports = router;
