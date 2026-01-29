const express = require('express');
const router = express.Router();
const db = require('../db');

// GET expert analysis by project ID or name
router.get('/expert-analysis', async (req, res) => {
  try {
    const { projectId, projectName } = req.query;
    
    if (!projectId && !projectName) {
      return res.status(400).json({ error: 'Project ID or name is required' });
    }

    let query;
    let params;
    
    if (projectId) {
      // Try to match by project_id (could be string or integer)
      query = 'SELECT * FROM expert_analysis WHERE project_id::text = $1';
      params = [projectId];
    } else {
      query = 'SELECT * FROM expert_analysis WHERE project_name ILIKE $1';
      params = [`%${projectName}%`];
    }

    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.json(null); // Return null instead of error for new projects
    }
    
    // Format the response
    const analysis = result.rows[0];
    res.json({
      projectId: analysis.project_id,
      projectName: analysis.project_name,
      overallScore: analysis.overall_score,
      overallRating: analysis.overall_rating,
      confidence: analysis.confidence,
      thermalScore: analysis.thermal_score,
      thermalBreakdown: analysis.thermal_breakdown,
      redevelopmentScore: analysis.redevelopment_score,
      redevelopmentBreakdown: analysis.redevelopment_breakdown,
      infrastructureScore: analysis.infrastructure_score,
      editedBy: analysis.edited_by,
      editedAt: analysis.edited_at
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST to save/update expert analysis
router.post('/expert-analysis', async (req, res) => {
  try {
    const {
      projectId,
      projectName,
      overallScore = 0.00,
      overallRating = 'N/A',
      confidence = 0,
      thermalScore = 0.00,
      thermalBreakdown = {},
      redevelopmentScore = 0.00,
      redevelopmentBreakdown = {},
      infrastructureScore = 0.00,
      editedBy = 'System'
    } = req.body;
    
    if (!projectId || !projectName) {
      return res.status(400).json({ error: 'Project ID and name are required' });
    }

    // Check if record exists
    const existing = await db.query(
      'SELECT id FROM expert_analysis WHERE project_id::text = $1',
      [projectId.toString()]
    );

    if (existing.rows.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE expert_analysis 
         SET project_name = $1,
             overall_score = $2,
             overall_rating = $3,
             confidence = $4,
             thermal_score = $5,
             thermal_breakdown = $6,
             redevelopment_score = $7,
             redevelopment_breakdown = $8,
             infrastructure_score = $9,
             edited_by = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE project_id::text = $11`,
        [
          projectName,
          overallScore,
          overallRating,
          confidence,
          thermalScore,
          JSON.stringify(thermalBreakdown),
          redevelopmentScore,
          JSON.stringify(redevelopmentBreakdown),
          infrastructureScore,
          editedBy,
          projectId.toString()
        ]
      );
    } else {
      // Insert new record
      await db.query(
        `INSERT INTO expert_analysis 
         (project_id, project_name, overall_score, overall_rating, confidence,
          thermal_score, thermal_breakdown, redevelopment_score, 
          redevelopment_breakdown, infrastructure_score, edited_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          projectId, // Let PostgreSQL handle type conversion
          projectName,
          overallScore,
          overallRating,
          confidence,
          thermalScore,
          JSON.stringify(thermalBreakdown),
          redevelopmentScore,
          JSON.stringify(redevelopmentBreakdown),
          infrastructureScore,
          editedBy
        ]
      );
    }
    
    res.json({ success: true, message: 'Expert analysis saved successfully' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save expert analysis' });
  }
});

// GET transmission data
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

// POST to save transmission data
router.post('/transmission-interconnection', async (req, res) => {
  try {
    const { projectId, transmissionData } = req.body;
    
    if (!projectId || !transmissionData) {
      return res.status(400).json({ error: 'Project ID and transmission data are required' });
    }

    await db.query('BEGIN');
    
    // Delete existing data for this project
    await db.query(
      'DELETE FROM transmission_interconnection WHERE project_id::text = $1',
      [projectId.toString()]
    );
    
    // Insert new data
    for (const item of transmissionData) {
      await db.query(
        `INSERT INTO transmission_interconnection 
         (site, poi_voltage, excess_injection_capacity, excess_withdrawal_capacity, 
          constraints, excess_ix_capacity, project_id)
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
