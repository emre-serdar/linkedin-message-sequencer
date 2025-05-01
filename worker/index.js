// worker/index.js

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { Pool } = require('pg');
require('dotenv').config();

// Setup Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

// Setup Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create BullMQ Worker
const worker = new Worker('message-queue', async (job) => {
  const { campaignId, prospect, step } = job.data;

  console.log(`📨 Processing message for ${prospect.firstName} ${prospect.lastName}, step ${step.stepOrder}`);

  try {
    // Simulate sending message (in reality, call LinkedIn API or mock API)
    const personalizedMessage = step.messageTemplate.replace('{{firstName}}', prospect.firstName);

    console.log(`📝 Sending message: "${personalizedMessage}" to ${prospect.profileUrl}`);

    // Step 1: Find delivery record (it should exist with status PENDING)
    const deliveryResult = await pool.query(
      `SELECT id FROM deliveries
       WHERE campaign_id = $1
         AND prospect_id = (SELECT id FROM prospects WHERE profile_url = $2 LIMIT 1)
         AND sequence_step_id = (SELECT id FROM sequence_steps WHERE campaign_id = $1 AND step_order = $3 LIMIT 1)
       LIMIT 1`,
      [campaignId, prospect.profileUrl, step.stepOrder]
    );

    if (deliveryResult.rows.length === 0) {
      throw new Error('Delivery record not found.');
    }

    const deliveryId = deliveryResult.rows[0].id;

    // Step 2: Update delivery status from PENDING → SENT
    await pool.query(
      `UPDATE deliveries SET status = 'SENT' WHERE id = $1`,
      [deliveryId]
    );

    console.log(`✅ Delivery marked as SENT for ${prospect.firstName} ${prospect.lastName}`);

    // Step 3: Simulate reply tracking (30% chance of reply)
    const replied = Math.random() < 0.3;

    if (replied) {
      console.log(`💬 ${prospect.firstName} ${prospect.lastName} replied!`);

      // Mark all future deliveries for this prospect as STOPPED
      await pool.query(
        `UPDATE deliveries
         SET status = 'STOPPED'
         WHERE campaign_id = $1
           AND prospect_id = (SELECT id FROM prospects WHERE profile_url = $2 LIMIT 1)
           AND id != $3
           AND status = 'PENDING'`,
        [campaignId, prospect.profileUrl, deliveryId]
      );
    }

    return true;
  } catch (error) {
    console.error('❌ Error processing job:', error);
    throw error; // Re-throw so BullMQ knows this job failed
  }
}, {
  connection: redisConnection,
});

// Handle worker events
worker.on('completed', (job) => {
  console.log(`🎉 Job completed successfully: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`💥 Job ${job.id} failed:`, err.message);
});
