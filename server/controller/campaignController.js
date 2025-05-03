const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');
const { Pool } = require('pg');
const messageQueue = require('../queues/messageQueue');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Validate LinkedIn profile URL
const validateProfileUrl = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 1000 });
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.status === 404) return false;
    return true;
  }
};

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    const csvFilePath = path.join(__dirname, '..', req.file.path);
    const fileContent = fs.readFileSync(csvFilePath);

    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }, async (err, records) => {
      if (err) return res.status(500).json({ message: 'Error parsing CSV.' });

      const validatedProspects = [];
      const invalidProspects = [];

      for (const prospect of records) {
        const { firstName, lastName, profileUrl } = prospect;
        if (!firstName || !lastName || !profileUrl || !profileUrl.startsWith('https://linkedin.com/in/')) {
          invalidProspects.push({ ...prospect, reason: 'Missing or invalid fields' });
          continue;
        }
        const exists = await validateProfileUrl(profileUrl);
        if (!exists) {
          invalidProspects.push({ ...prospect, reason: 'Profile does not exist' });
          continue;
        }
        validatedProspects.push(prospect);
      }

      if (invalidProspects.length > 0) {
        return res.status(400).json({ message: 'Invalid prospect data found.', invalidProspects });
      }

      let sequenceSteps;
      try {
        sequenceSteps = JSON.parse(req.body.sequenceSteps);
        if (!Array.isArray(sequenceSteps) || sequenceSteps.length === 0) throw new Error();
        for (const step of sequenceSteps) {
          if (!step.stepOrder || !step.messageTemplate || typeof step.delayHours !== 'number') {
            return res.status(400).json({ message: 'Invalid step format detected.', invalidStep: step });
          }
        }
      } catch (err) {
        return res.status(400).json({ message: 'Malformed sequenceSteps JSON.' });
      }

      const campaignResult = await pool.query(
        'INSERT INTO campaigns (name) VALUES ($1) RETURNING id',
        [req.body.campaignName || 'Untitled Campaign']
      );
      const campaignId = campaignResult.rows[0].id;

      const prospectIdMap = {};

      for (const prospect of validatedProspects) {
        const result = await pool.query(
          'INSERT INTO prospects (first_name, last_name, profile_url, company, campaign_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [prospect.firstName, prospect.lastName, prospect.profileUrl, prospect.company || null, campaignId]
        );
        prospectIdMap[prospect.profileUrl] = result.rows[0].id;
      }

      for (const step of sequenceSteps) {
        await pool.query(
          'INSERT INTO sequence_steps (campaign_id, step_order, message_template, delay_hours) VALUES ($1, $2, $3, $4)',
          [campaignId, step.stepOrder, step.messageTemplate, step.delayHours]
        );
      }

      for (const prospect of validatedProspects) {
        const prospectId = prospectIdMap[prospect.profileUrl];
        for (const step of sequenceSteps) {
          const scheduledTime = new Date(Date.now() + step.delayHours * 60 * 60 * 1000);
          await pool.query(
            `INSERT INTO deliveries (
              campaign_id, prospect_id, sequence_step_id, status, scheduled_execution
            ) VALUES (
              $1,
              $2,
              (SELECT id FROM sequence_steps WHERE campaign_id = $1 AND step_order = $3 LIMIT 1),
              'PENDING',
              $4
            )`,
            [campaignId, prospectId, step.stepOrder, scheduledTime]
          );
        }
      }

      for (const prospect of validatedProspects) {
        const prospectId = prospectIdMap[prospect.profileUrl];
        for (const step of sequenceSteps) {
          const delayMs = step.delayHours * 60 * 60 * 1000;
          await messageQueue.add(
            'send-linkedin-message',
            { campaignId, prospect: { ...prospect, id: prospectId }, step },
            { delay: delayMs, removeOnComplete: true, removeOnFail: true }
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

// Get all scheduled jobs and their time remaining
exports.getJobs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.id,
        d.status,
        d.replied,
        d.scheduled_execution,
        d.campaign_id,
        p.first_name AS prospectFirstName,
        p.last_name AS prospectLastName,
        p.profile_url AS profileUrl,
        ss.step_order AS stepOrder
      FROM deliveries d
      JOIN prospects p ON d.prospect_id = p.id
      JOIN sequence_steps ss ON d.sequence_step_id = ss.id
      ORDER BY d.scheduled_execution ASC
    `);

    const now = Date.now();

    const jobs = result.rows.map((row) => {
      const scheduledTime = new Date(row.scheduled_execution);
      const remainingMs = scheduledTime.getTime() - now;
      const totalMinutes = Math.floor(remainingMs / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      const remainingFormatted =
        totalMinutes <= 0
          ? "Now"
          : [
              days > 0 ? `${days}d` : null,
              hours > 0 ? `${hours}h` : null,
              minutes > 0 ? `${minutes}m` : null,
            ]
              .filter(Boolean)
              .join(" ");

      return {
        id: row.id,
        prospectFirstName: row.prospectfirstname,
        prospectLastName: row.prospectlastname,
        profileUrl: row.profileurl,
        stepOrder: row.steporder,
        scheduledExecution: scheduledTime.toISOString(),
        remainingMinutes: Math.max(0, totalMinutes),
        remainingFormatted,
        status: row.status,
        campaignId: row.campaign_id,
        replied: row.replied,
      };
    });

    res.status(200).json({ jobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark current delivery as replied and stop future ones
exports.mockReply = async (req, res) => {
  const { deliveryId } = req.params;
  try {
    const deliveryResult = await pool.query(
      `SELECT campaign_id, prospect_id, sequence_step_id FROM deliveries WHERE id = $1`,
      [deliveryId]
    );

    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Delivery not found.' });
    }

    const { campaign_id, prospect_id, sequence_step_id } = deliveryResult.rows[0];

    // ✅ Set current delivery as replied (DO NOT TOUCH)
    await pool.query(`UPDATE deliveries SET replied = true WHERE id = $1`, [deliveryId]);

    const stepOrderResult = await pool.query(
      `SELECT step_order FROM sequence_steps WHERE id = $1`,
      [sequence_step_id]
    );
    const currentStepOrder = stepOrderResult.rows[0]?.step_order;

    // ✅ Stop future deliveries in DB
    const stopResult = await pool.query(
      `UPDATE deliveries
       SET status = 'STOPPED'
       WHERE campaign_id = $1
         AND prospect_id = $2
         AND status = 'PENDING'
         AND sequence_step_id IN (
           SELECT id FROM sequence_steps
           WHERE campaign_id = $1 AND step_order > $3
         )`,
      [campaign_id, prospect_id, currentStepOrder]
    );

    // 🧠 Additional: Remove matching delayed jobs from Redis
    const delayedJobs = await messageQueue.getDelayed();
    let removedCount = 0;
    for (const job of delayedJobs) {
      const { campaignId, prospect, step } = job.data || {};
      if (
        campaignId === campaign_id &&
        prospect?.id === prospect_id &&
        step?.stepOrder > currentStepOrder
      ) {
        await job.remove();
        removedCount++;
      }
    }

    return res.status(200).json({
      message: `✅ Prospect replied. ${stopResult.rowCount} future deliveries stopped, ${removedCount} Redis jobs removed.`,
      repliedId: deliveryId,
    });
  } catch (error) {
    console.error('Error in mockReply:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
