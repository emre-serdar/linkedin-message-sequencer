// server/controllers/campaignController.js

exports.createCampaign = async (req, res) => {
    try {
      console.log('Received file:', req.file);
      console.log('Received body:', req.body);
  
      res.status(200).json({ message: 'Campaign received!' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  