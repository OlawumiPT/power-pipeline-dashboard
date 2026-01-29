const express = require('express');
const router = express.Router();
const db = require('../db');

// GET transmission data by project name
router.get('/transmission-interconnection', async (req, res) => {
  try {
    const { project } = req.query;
    
    if (!project) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const query = `
      SELECT 
        site, 
        poi_voltage as "poiVoltage",
        excess_injection_capacity as "excessInjectionCapacity",
        excess_withdrawal_capacity as "excessWithdrawalCapacity",
        constraints,
        excess_ix_capacity as "excessIXCapacity"
      FROM transmission_interconnection 
      WHERE LOWER(site) LIKE LOWER($1) 
         OR $1 LIKE '%' || LOWER(site) || '%'
      ORDER BY site, poi_voltage
    `;

    const result = await db.query(query, [`%${project}%`]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST to save edited transmission data
router.post('/transmission-interconnection', async (req, res) => {
  try {
    const { projectId, transmissionData } = req.body;
    
    if (!projectId || !transmissionData) {
      return res.status(400).json({ error: 'Project ID and transmission data are required' });
    }

    await db.query('BEGIN');
    
    await db.query(
      'DELETE FROM transmission_interconnection WHERE project_id = $1',
      [projectId]
    );
    
    for (const item of transmissionData) {
      await db.query(
        `INSERT INTO transmission_interconnection 
         (site, poi_voltage, excess_injection_capacity, excess_withdrawal_capacity, constraints, excess_ix_capacity, project_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          item.site,
          item.poiVoltage,
          item.excessInjectionCapacity,
          item.excessWithdrawalCapacity,
          item.constraints,
          item.excessIXCapacity,
          projectId
        ]
      );
    }
    
    await db.query('COMMIT');
    
    res.json({ success: true, message: 'Transmission data saved successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save transmission data' });
  }
});

module.exports = router;
