// worker/index.js

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const { Pool } = require('pg');
require('dotenv').config();

// Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// BullMQ Worker: handles scheduled message jobs
const worker = new Worker('message-queue', async (job) => {
  const { campaignId, prospect, step } = job.data;

  console.log(`📨 Processing message for ${prospect.firstName} ${prospect.lastName}, step ${step.stepOrder}`);

  try {
    const personalizedMessage = step.messageTemplate.replace('{{firstName}}', prospect.firstName);
    console.log(`📝 Sending message: "${personalizedMessage}" to ${prospect.profileUrl}`);

    // Get delivery ID for current step
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

    // Mark pending delivery as SENT
    await pool.query(
      `UPDATE deliveries SET status = 'SENT' WHERE id = $1 AND status = 'PENDING'`,
      [deliveryId]
    );
    

    console.log(`✅ Delivery marked as SENT for ${prospect.firstName} ${prospect.lastName}`);

    return true;
  } catch (error) {
    console.error('❌ Error processing job:', error);
    throw error;
  }
}, {
  connection: redisConnection,
});

// Worker events
worker.on('completed', (job) => {
  console.log(`🎉 Job completed successfully: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`💥 Job ${job.id} failed:`, err.message);
});
