const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/api/expert-analysis', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId query parameter is required' });
    }

    console.log(`Fetching expert analysis for project ID: ${projectId}`);
    
    // 1. First, get project details from projects table
    const projectResult = await db.query(
      'SELECT id, project_name FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: `Project with ID ${projectId} not found` });
    }
    
    const project = projectResult.rows[0];
    
    // 2. Check if expert_analysis table exists
    let tableExists;
    try {
      tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'expert_analysis'
        )
      `);
    } catch (e) {
      console.log('Error checking table existence:', e.message);
      tableExists = { rows: [{ exists: false }] };
    }
    
    let analysis = null;
    if (tableExists.rows[0].exists) {
      // 3. Get analysis data
      const analysisResult = await db.query(
        'SELECT * FROM expert_analysis WHERE project_id = $1',
        [projectId]
      );
      
      if (analysisResult.rows.length > 0) {
        analysis = analysisResult.rows[0];
      }
    }
    
    // 4. Format response to match frontend expectations
    // Based on your screenshot, the frontend expects:
    // - environmentalConsiderations
    // - landAvailability
    // - utilities
    // - weight
    // - infrastructureScore
    // - interconnection
    // - transmissionDetails
    
    const response = {
      projectId: parseInt(projectId),
      projectName: project.project_name,
      // Default values from your UI screenshot
      environmentalConsiderations: analysis?.environmental_considerations || 'Env Environmental Considerations',
      landAvailability: analysis?.land_availability || '2-Known, mitigable, no cost advantage',
      utilities: analysis?.utilities || '2-Utilities nearby, low cost',
      weight: analysis?.weight || 15.00,
      infrastructureScore: analysis?.infrastructure_score || 0.00,
      interconnection: analysis?.interconnection || '2-No upgrades needed (Unsecured)',
      transmissionDetails: analysis?.transmission_details || {
        poiVoltage: "115",
        excessCapacity: 80,
        injectionCapacity: 120,
        constraints: ""
      }
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
    
  } catch (error) {
    console.error('Database error in GET /api/expert-analysis:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// POST to save/update expert analysis - FIXED PATH to match frontend
// Frontend calls: POST /api/expert-analysis
router.post('/api/expert-analysis', async (req, res) => {
  try {
    console.log('POST /api/expert-analysis received:', JSON.stringify(req.body, null, 2));
    
    const {
      projectId,
      environmentalConsiderations,
      landAvailability,
      utilities,
      weight,
      infrastructureScore,
      interconnection,
      transmissionDetails
    } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // 1. Ensure project exists
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: `Project with ID ${projectId} not found` });
    }

    // 2. Ensure expert_analysis table has the correct structure
    await db.query(`
      CREATE TABLE IF NOT EXISTS expert_analysis (
        id SERIAL PRIMARY KEY,
        project_id INTEGER UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
        environmental_considerations TEXT,
        land_availability TEXT,
        utilities TEXT,
        weight DECIMAL(5,2),
        infrastructure_score DECIMAL(5,2),
        interconnection TEXT,
        transmission_details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 3. Check if analysis already exists
    const existing = await db.query(
      'SELECT id FROM expert_analysis WHERE project_id = $1',
      [projectId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      result = await db.query(
        `UPDATE expert_analysis 
         SET environmental_considerations = $2,
             land_availability = $3,
             utilities = $4,
             weight = $5,
             infrastructure_score = $6,
             interconnection = $7,
             transmission_details = $8,
             updated_at = NOW()
         WHERE project_id = $1
         RETURNING *`,
        [
          projectId,
          environmentalConsiderations || 'Env Environmental Considerations',
          landAvailability || '2-Known, mitigable, no cost advantage',
          utilities || '2-Utilities nearby, low cost',
          weight || 15.00,
          infrastructureScore || 0.00,
          interconnection || '2-No upgrades needed (Unsecured)',
          JSON.stringify(transmissionDetails || {})
        ]
      );
    } else {
      // Insert new record
      result = await db.query(
        `INSERT INTO expert_analysis 
         (project_id, environmental_considerations, land_availability, utilities,
          weight, infrastructure_score, interconnection, transmission_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          projectId,
          environmentalConsiderations || 'Env Environmental Considerations',
          landAvailability || '2-Known, mitigable, no cost advantage',
          utilities || '2-Utilities nearby, low cost',
          weight || 15.00,
          infrastructureScore || 0.00,
          interconnection || '2-No upgrades needed (Unsecured)',
          JSON.stringify(transmissionDetails || {})
        ]
      );
    }
    
    console.log('Successfully saved expert analysis');
    res.json({ 
      success: true, 
      message: 'Expert analysis saved successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Save error in POST /api/expert-analysis:', error);
    res.status(500).json({ 
      error: 'Failed to save expert analysis',
      details: error.message,
      code: error.code
    });
  }
});

// GET transmission data - FIXED PATH to match frontend
// Frontend calls: GET /api/transmission-interconnection?project=Dartmouth%20Power%20Associates%20LP
router.get('/api/transmission-interconnection', async (req, res) => {
  try {
    const { project } = req.query;
    
    console.log(`Fetching transmission data for project: ${project}`);
    
    if (!project) {
      return res.status(400).json({ error: 'project query parameter is required' });
    }

    // First find the project by name
    const projectResult = await db.query(
      'SELECT id, project_name FROM projects WHERE project_name ILIKE $1 LIMIT 1',
      [`%${project}%`]
    );
    
    let projectId = null;
    if (projectResult.rows.length > 0) {
      projectId = projectResult.rows[0].id;
    }
    
    let query;
    let params;
    
    if (projectId) {
      // If project found, get transmission data for this project
      query = `
        SELECT 
          site, 
          poi_voltage as "poiVoltage",
          excess_injection_capacity as "excessCapacity",
          excess_injection_capacity as "injectionCapacity",
          excess_withdrawal_capacity as "withdrawalCapacity",
          constraints,
          excess_ix_capacity as "excessIXCapacity",
          project_id as "projectId",
          notes
        FROM transmission_interconnection 
        WHERE project_id = $1 OR project_id IS NULL
        ORDER BY site, poi_voltage
      `;
      params = [projectId];
    } else {
      // If project not found, return generic transmission data
      query = `
        SELECT 
          site, 
          poi_voltage as "poiVoltage",
          excess_injection_capacity as "excessCapacity",
          excess_injection_capacity as "injectionCapacity",
          excess_withdrawal_capacity as "withdrawalCapacity",
          constraints,
          excess_ix_capacity as "excessIXCapacity",
          project_id as "projectId",
          notes
        FROM transmission_interconnection 
        WHERE project_id IS NULL
        ORDER BY site, poi_voltage
        LIMIT 10
      `;
      params = [];
    }

    const result = await db.query(query, params);
    
    // Format to match frontend table structure
    const formattedData = result.rows.map(row => ({
      site: row.site,
      poiVoltage: row.poiVoltage,
      excessCapacity: row.excessCapacity,
      injectionCapacity: row.injectionCapacity,
      withdrawalCapacity: row.withdrawalCapacity,
      constraints: row.constraints || '',
      actions: 'Remove', // Frontend expects actions column
      projectId: row.projectId,
      notes: row.notes || ''
    }));
    
    console.log(`Returning ${formattedData.length} transmission records`);
    res.json(formattedData);
    
  } catch (error) {
    console.error('Database error in GET /api/transmission-interconnection:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// POST to save transmission data
router.post('/api/transmission-interconnection', async (req, res) => {
  try {
    const { projectId, transmissionData } = req.body;
    
    if (!projectId || !transmissionData) {
      return res.status(400).json({ error: 'Project ID and transmission data are required' });
    }

    await db.query('BEGIN');
    
    // First, clear existing data for this project
    await db.query(
      'DELETE FROM transmission_interconnection WHERE project_id = $1',
      [projectId]
    );
    
    // Insert new data
    for (const item of transmissionData) {
      await db.query(
        `INSERT INTO transmission_interconnection 
         (site, poi_voltage, excess_injection_capacity, excess_withdrawal_capacity, 
          constraints, excess_ix_capacity, project_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          item.site,
          item.poiVoltage,
          item.excessCapacity || item.excessInjectionCapacity,
          item.withdrawalCapacity || item.excessWithdrawalCapacity,
          item.constraints || '',
          item.excessIXCapacity || true,
          projectId,
          item.notes || ''
        ]
      );
    }
    
    await db.query('COMMIT');
    
    res.json({ success: true, message: 'Transmission data saved successfully' });
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Save error in POST /api/transmission-interconnection:', error);
    res.status(500).json({ error: 'Failed to save transmission data' });
  }
});

// ============================================================================
// HEALTH CHECK (keep this endpoint for monitoring)
// ============================================================================
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Expert Analysis API',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DEBUG ENDPOINTS (optional, for troubleshooting)
// ============================================================================
router.get('/api/debug/projects/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, project_name, plant_owner, iso, location FROM projects WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/debug/expert-analysis-table', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expert_analysis'
      ORDER BY ordinal_position
    `);
    res.json(result.rows);
  } catch (error) {
    res.json({ error: error.message, tableExists: false });
  }
});

module.exports = router;
