const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');

// Small helper to validate LinkedIn profile URLs
const validateProfileUrl = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 1000 }); // 1 second timeout
    return response.status === 200;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return false; // Profile does not exist
    }
    // For other errors (timeout, forbidden), assume soft-pass
    return true;
  }
};

// Main controller function
exports.createCampaign = async (req, res) => {
  try {
    console.log('Received file:', req.file);
    console.log('Received body:', req.body);

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const csvFilePath = path.join(__dirname, '..', req.file.path);

    const fileContent = fs.readFileSync(csvFilePath);

    // Parse CSV
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }, async (err, records) => {
      if (err) {
        console.error('Error parsing CSV:', err);
        return res.status(500).json({ message: 'Error parsing CSV' });
      }

      console.log('Parsed prospects:', records);

      // Validate prospects
      const validatedProspects = [];
      const invalidProspects = [];

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
        console.error('Invalid prospects found:', invalidProspects);
        return res.status(400).json({ message: 'Invalid prospect data found.', invalidProspects });
      }

      console.log('Validated prospects:', validatedProspects);

      // ✅ Now validate sequenceSteps
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
        console.error('Error parsing sequenceSteps:', error);
        return res.status(400).json({ message: 'Malformed sequenceSteps JSON.' });
      }

      console.log('Validated sequence steps:', sequenceSteps);

      // ✅ Everything validated at this point
      // TODO: Insert prospects and sequenceSteps into database
      // TODO: Create Campaign entry and assign prospects to campaign

      res.status(200).json({ message: 'Campaign received!', prospects: validatedProspects, sequenceSteps });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
