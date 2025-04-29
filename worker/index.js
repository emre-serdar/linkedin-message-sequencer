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
    // Simulate sending message (in reality, you'd call LinkedIn API or a mock API)
    const personalizedMessage = step.messageTemplate.replace('{{firstName}}', prospect.firstName);

    console.log(`📝 Sending message: "${personalizedMessage}" to ${prospect.profileUrl}`);

    // Insert delivery record into the database
    await pool.query(
      `INSERT INTO deliveries (campaign_id, prospect_id, sequence_step_id, status)
       VALUES (
         $1,
         (SELECT id FROM prospects WHERE profile_url = $2 LIMIT 1),
         (SELECT id FROM sequence_steps WHERE campaign_id = $1 AND step_order = $3 LIMIT 1),
         'SENT'
       )`,
      [campaignId, prospect.profileUrl, step.stepOrder]
    );

    console.log(`✅ Delivery logged for ${prospect.firstName} ${prospect.lastName}`);

    return true;
  } catch (error) {
    console.error('❌ Error processing job:', error);

    // You can optionally update status to FAILED in deliveries table
    // (nice-to-have, not urgent for MVP)

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
