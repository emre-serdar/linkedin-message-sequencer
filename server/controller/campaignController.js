const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper to validate LinkedIn profile URLs
const validateProfileUrl = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 1000 }); // 1 second timeout
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false; // Profile does not exist
    }
    return true; // For timeout/forbidden, soft-pass
  }
};

// Main controller to handle campaign creation
exports.createCampaign = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const csvFilePath = path.join(__dirname, '..', req.file.path);
    const fileContent = fs.readFileSync(csvFilePath);

    // Parse CSV file
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }, async (err, records) => {
      if (err) {
        return res.status(500).json({ message: 'Error parsing CSV.' });
      }

      const validatedProspects = [];
      const invalidProspects = [];

      // Validate each prospect
      for (const prospect of records) {
        const { firstName, lastName, profileUrl } = prospect;

        if (!firstName || !lastName || !profileUrl) {
          invalidProspects.push({ reason: 'Missing required fields', ...prospect });
          continue;
        }

        if (!profileUrl.startsWith('https://linkedin.com/in/')) {
          invalidProspects.push({ reason: 'Invalid profile URL format', ...prospect });
          continue;
        }

        const profileExists = await validateProfileUrl(profileUrl);

        if (!profileExists) {
          invalidProspects.push({ reason: 'LinkedIn profile does not exist', ...prospect });
          continue;
        }

        validatedProspects.push(prospect);
      }

      if (invalidProspects.length > 0) {
        return res.status(400).json({ message: 'Invalid prospect data found.', invalidProspects });
      }

      // Validate sequence steps
      let sequenceSteps;
      try {
        sequenceSteps = JSON.parse(req.body.sequenceSteps);

        if (!Array.isArray(sequenceSteps) || sequenceSteps.length === 0) {
          return res.status(400).json({ message: 'Invalid or missing sequenceSteps array.' });
        }

        for (const step of sequenceSteps) {
          if (
            typeof step.stepOrder !== 'number' ||
            step.stepOrder < 1 ||
            !step.messageTemplate ||
            typeof step.messageTemplate !== 'string' ||
            typeof step.delayHours !== 'number' ||
            step.delayHours < 0
          ) {
            return res.status(400).json({ message: 'Invalid step format detected.', invalidStep: step });
          }
        }
      } catch (error) {
        return res.status(400).json({ message: 'Malformed sequenceSteps JSON.' });
      }

      // ✅ Everything validated at this point

      const campaignName = req.body.campaignName || 'Untitled Campaign';

      // Insert new campaign
      const campaignResult = await pool.query(
        'INSERT INTO campaigns (name) VALUES ($1) RETURNING id',
        [campaignName]
      );
      const campaignId = campaignResult.rows[0].id;

      // Insert prospects
      for (const prospect of validatedProspects) {
        const { firstName, lastName, profileUrl, company } = prospect;

        await pool.query(
          'INSERT INTO prospects (first_name, last_name, profile_url, company, campaign_id) VALUES ($1, $2, $3, $4, $5)',
          [firstName, lastName, profileUrl, company || null, campaignId]
        );
      }
      
      // Insert sequence steps
      for (const step of sequenceSteps) {
        const { stepOrder, messageTemplate, delayHours } = step;

        await pool.query(
          'INSERT INTO sequence_steps (campaign_id, step_order, message_template, delay_hours) VALUES ($1, $2, $3, $4)',
          [campaignId, stepOrder, messageTemplate, delayHours]
        );
      }

      console.log(`✅ Campaign and ${validatedProspects.length} prospects inserted for campaign ID ${campaignId}.`);

      res.status(200).json({ message: 'Campaign created successfully!', campaignId });
    });

  } catch (error) {
    console.error('❌ Error in createCampaign:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
