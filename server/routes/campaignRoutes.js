const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// Import controllers
const {
  createCampaign,
  getJobs,
  mockReply, // <- add this
} = require('../controller/campaignController');

// Routes
router.post('/api/create-campaign', upload.single('prospectsCsv'), createCampaign);
router.get('/api/jobs', getJobs);

// route to simulate reply
router.post('/api/reply/:deliveryId', mockReply);

module.exports = router;
