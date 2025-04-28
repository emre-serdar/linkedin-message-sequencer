const express = require('express');
const app = express();
require('dotenv').config();


// Import the campaign routes
const campaignRoutes = require('./routes/campaignRoutes');

app.use(express.json());
app.use(campaignRoutes);

// Server listening (you already have)
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
