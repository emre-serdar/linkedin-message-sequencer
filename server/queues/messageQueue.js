// server/queues/messageQueue.js

const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
};

// Setup Redis connection


// Create the BullMQ queue
const messageQueue = new Queue('message-queue', {
  connection,
});

module.exports = messageQueue;
