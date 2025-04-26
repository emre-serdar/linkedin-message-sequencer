const { Worker } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config();

const connection = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

const worker = new Worker('message-queue', async job => {
  console.log(`Processing job ID ${job.id}:`, job.data);

  // Simulate message sending (just a simple timeout)
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`Finished processing job ID ${job.id}`);
}, {
  connection
});

worker.on('completed', job => {
  console.log(`Job completed successfully: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job failed: ${job.id}`, err);
});

console.log("Worker is running and listening for jobs...");
