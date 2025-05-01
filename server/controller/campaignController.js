const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');
const { Pool } = require('pg');
const messageQueue = require('../queues/messageQueue');
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

      // Insert initial PENDING deliveries
      for (const prospect of validatedProspects) {
        for (const step of sequenceSteps) {
          await pool.query(
            `INSERT INTO deliveries (campaign_id, prospect_id, sequence_step_id, status)
             VALUES (
               $1,
               (SELECT id FROM prospects WHERE profile_url = $2 LIMIT 1),
               (SELECT id FROM sequence_steps WHERE campaign_id = $1 AND step_order = $3 LIMIT 1),
               'PENDING'
             )`,
            [campaignId, prospect.profileUrl, step.stepOrder]
          );
        }
      }

      // ✅ After database insertions, enqueue jobs into Redis
      for (const prospect of validatedProspects) {
        for (const step of sequenceSteps) {
          const delayMilliseconds = step.delayHours * 60 * 60 * 1000; // Convert hours to milliseconds

          await messageQueue.add(
            'send-linkedin-message',
            {
              campaignId,
              prospect,
              step,
            },
            {
              delay: delayMilliseconds,
              removeOnComplete: true,
              removeOnFail: true,
            }
          );

          console.log(`✅ Enqueued job for ${prospect.firstName} ${prospect.lastName} - Step ${step.stepOrder}`);
        }
      }

      console.log(`✅ Campaign and ${validatedProspects.length} prospects inserted for campaign ID ${campaignId}.`);
      res.status(200).json({ message: 'Campaign created successfully!', campaignId });

    });

  } catch (error) {
    console.error('❌ Error in createCampaign:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Controller to get ALL jobs from the database with enriched info
exports.getJobs = async (req, res) => {
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        p.first_name AS prospectFirstName,
        p.last_name AS prospectLastName,
        p.profile_url,
        ss.step_order AS stepOrder,
        d.status,
        d.created_at,
        ss.delay_hours,
        d.campaign_id
      FROM deliveries d
      JOIN prospects p ON d.prospect_id = p.id
      JOIN sequence_steps ss ON d.sequence_step_id = ss.id
      ORDER BY d.created_at DESC
    `);

    const now = Date.now();

    const jobs = result.rows.map((row) => {
      const scheduledTime = new Date(new Date(row.created_at).getTime() + row.delay_hours * 60 * 60 * 1000);
      const remainingMinutes = Math.max(0, Math.floor((scheduledTime.getTime() - now) / 60000));

      return {
        id: row.id,
        prospectFirstName: row.prospectfirstname,
        prospectLastName: row.prospectlastname,
        profileUrl: row.profile_url,
        stepOrder: row.steporder,
        scheduledExecution: scheduledTime.toISOString(),
        remainingMinutes,
        status: row.status,
        campaignId: row.campaign_id,
      };
    });

    res.status(200).json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
