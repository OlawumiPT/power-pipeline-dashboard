const express = require('express');
const router = express.Router();
const {
  getExpertAnalysis,
  saveExpertAnalysis,
  getTransmissionInterconnection,
  saveTransmissionInterconnection
} = require('../controllers/expertAnalysisController');

// Check if auth middleware exists
let protect;
try {
  const authMiddleware = require('../middleware/authMiddleware');
  protect = authMiddleware.protect || authMiddleware;
} catch (error) {
  console.log('⚠️ No auth middleware found, using dummy middleware');
  protect = (req, res, next) => {
    console.log('🔓 Bypassing auth for expert analysis routes');
    next();
  };
}

// Expert Analysis Routes
router.get('/expert-analysis', protect, getExpertAnalysis);
router.post('/expert-analysis', protect, saveExpertAnalysis);

// Transmission Interconnection Routes
router.get('/transmission-interconnection', protect, getTransmissionInterconnection);
router.post('/transmission-interconnection', protect, saveTransmissionInterconnection);

module.exports = router;
