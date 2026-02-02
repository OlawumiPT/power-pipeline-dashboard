const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================================================
// TRANSMISSION INTERCONNECTION ROUTES
// ============================================================================

// GET transmission data - FRONTEND CALLS: GET /api/transmission-interconnection?project=Dartmouth%20Power%20Associates%20LP
router.get('/transmission-interconnection', async (req, res) => {
  try {
    const { project } = req.query;
    
    console.log(`[TRANSMISSION API] GET /transmission-interconnection for project: "${project}"`);
    
    if (!project) {
      return res.status(400).json({ 
        error: 'project query parameter is required' 
      });
    }

    // First find the project by name in the projects table
    const projectResult = await db.query(
      'SELECT id, project_name FROM pipeline_dashboard.projects WHERE project_name ILIKE $1 LIMIT 1',
      [`%${project}%`]
    );
    
    console.log(`[TRANSMISSION API] Project search results: ${projectResult.rows.length} found`);
    
    let projectId = null;
    let projectName = null;
    if (projectResult.rows.length > 0) {
      projectId = projectResult.rows[0].id;
      projectName = projectResult.rows[0].project_name;
      console.log(`[TRANSMISSION API] Found project: "${projectName}" (ID: ${projectId})`);
    } else {
      console.log(`[TRANSMISSION API] No exact project match found for "${project}"`);
      // Check if it might be a site name
      const siteResult = await db.query(
        'SELECT DISTINCT project_id FROM pipeline_dashboard.transmission_interconnection WHERE site ILIKE $1 LIMIT 1',
        [`%${project}%`]
      );
      if (siteResult.rows.length > 0) {
        projectId = siteResult.rows[0].project_id;
        console.log(`[TRANSMISSION API] Found project ID ${projectId} from site name`);
      }
    }
    
    let query;
    let params;
    
    if (projectId) {
      // If project found, get transmission data for this project
      query = `
        SELECT 
          id,
          site, 
          poi_voltage as "poiVoltage",
          excess_injection_capacity as "excessInjectionCapacity",
          excess_injection_capacity as "excessCapacity",
          excess_injection_capacity as "injectionCapacity",
          excess_withdrawal_capacity as "excessWithdrawalCapacity",
          excess_withdrawal_capacity as "withdrawalCapacity",
          constraints,
          excess_ix_capacity as "excessIXCapacity",
          project_id as "projectId",
          notes,
          created_at,
          updated_at
        FROM pipeline_dashboard.transmission_interconnection 
        WHERE project_id = $1 OR (project_id IS NULL AND $1::text IS NOT NULL)
        ORDER BY site, poi_voltage
      `;
      params = [projectId];
    } else {
      // If project not found, return generic transmission data
      query = `
        SELECT 
          id,
          site, 
          poi_voltage as "poiVoltage",
          excess_injection_capacity as "excessInjectionCapacity",
          excess_injection_capacity as "excessCapacity",
          excess_injection_capacity as "injectionCapacity",
          excess_withdrawal_capacity as "excessWithdrawalCapacity",
          excess_withdrawal_capacity as "withdrawalCapacity",
          constraints,
          excess_ix_capacity as "excessIXCapacity",
          project_id as "projectId",
          notes,
          created_at,
          updated_at
        FROM pipeline_dashboard.transmission_interconnection 
        WHERE project_id IS NULL
        ORDER BY site, poi_voltage
        LIMIT 10
      `;
      params = [];
    }

    console.log(`[TRANSMISSION API] Running query with params:`, params);
    const result = await db.query(query, params);
    
    // Format to match frontend table structure from your screenshot
    const formattedData = result.rows.map(row => ({
      id: row.id,
      site: row.site || '',
      poiVoltage: row.poiVoltage || '',
      excessCapacity: row.excessCapacity || row.excessInjectionCapacity || 0,
      injectionCapacity: row.injectionCapacity || row.excessInjectionCapacity || 0,
      withdrawalCapacity: row.withdrawalCapacity || row.excessWithdrawalCapacity || 0,
      constraints: row.constraints || '',
      actions: 'Remove', // Frontend expects actions column from screenshot
      projectId: row.projectId,
      projectName: projectName || `Project ${row.projectId || 'Unknown'}`,
      notes: row.notes || '',
      excessInjectionCapacity: row.excessInjectionCapacity || 0,
      excessWithdrawalCapacity: row.excessWithdrawalCapacity || 0,
      excessIXCapacity: row.excessIXCapacity || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    console.log(`[TRANSMISSION API] Returning ${formattedData.length} transmission records`);
    
    // If no data found, return empty array (not error) for frontend compatibility
    if (formattedData.length === 0) {
      console.log(`[TRANSMISSION API] No transmission data found for project "${project}"`);
      return res.json([]);
    }
    
    res.json(formattedData);
    
  } catch (error) {
    console.error('[TRANSMISSION API ERROR] GET /transmission-interconnection:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// POST to save edited transmission data - FRONTEND CALLS: POST /api/transmission-interconnection
router.post('/transmission-interconnection', async (req, res) => {
  try {
    console.log('[TRANSMISSION API] POST /transmission-interconnection received');
    console.log('[TRANSMISSION API] Request body:', JSON.stringify(req.body, null, 2));
    
    const { projectId, transmissionData } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ 
        error: 'Project ID is required' 
      });
    }

    if (!transmissionData || !Array.isArray(transmissionData)) {
      return res.status(400).json({ 
        error: 'transmissionData must be an array' 
      });
    }

    console.log(`[TRANSMISSION API] Saving ${transmissionData.length} transmission items for project ${projectId}`);

    // Verify project exists
    const projectCheck = await db.query(
      'SELECT id FROM pipeline_dashboard.projects WHERE id = $1',
      [projectId]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: `Project with ID ${projectId} not found` 
      });
    }

    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // First, clear existing data for this project
      console.log(`[TRANSMISSION API] Clearing existing transmission data for project ${projectId}`);
      await client.query(
        'DELETE FROM pipeline_dashboard.transmission_interconnection WHERE project_id = $1',
        [projectId]
      );
      
      // Insert new data
      let insertedCount = 0;
      for (const item of transmissionData) {
        // Skip if site is empty (maybe it's a placeholder row)
        if (!item.site || item.site.trim() === '') {
          console.log('[TRANSMISSION API] Skipping empty site item');
          continue;
        }
        
        console.log(`[TRANSMISSION API] Inserting: ${item.site} - ${item.poiVoltage}`);
        
        await client.query(
          `INSERT INTO pipeline_dashboard.transmission_interconnection 
           (site, poi_voltage, excess_injection_capacity, excess_withdrawal_capacity, 
            constraints, excess_ix_capacity, project_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            item.site || '',
            item.poiVoltage || '',
            item.excessInjectionCapacity || item.excessCapacity || item.injectionCapacity || 0,
            item.excessWithdrawalCapacity || item.withdrawalCapacity || 0,
            item.constraints || '',
            item.excessIXCapacity !== undefined ? item.excessIXCapacity : true,
            projectId,
            item.notes || ''
          ]
        );
        insertedCount++;
      }
      
      await client.query('COMMIT');
      
      console.log(`[TRANSMISSION API] Successfully saved ${insertedCount} transmission records`);
      
      res.json({ 
        success: true, 
        message: `Transmission data saved successfully (${insertedCount} records)`,
        count: insertedCount,
        projectId: projectId
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('[TRANSMISSION API ERROR] POST /transmission-interconnection:', error);
    res.status(500).json({ 
      error: 'Failed to save transmission data',
      details: error.message,
      code: error.code
    });
  }
});

// ADDITIONAL ENDPOINTS FOR COMPATIBILITY

// GET transmission data by ID (for editing individual records)
router.get('/transmission-interconnection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM pipeline_dashboard.transmission_interconnection WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transmission record not found' });
    }
    
    const record = result.rows[0];
    
    // Format response
    res.json({
      id: record.id,
      site: record.site,
      poiVoltage: record.poi_voltage,
      excessInjectionCapacity: record.excess_injection_capacity,
      excessWithdrawalCapacity: record.excess_withdrawal_capacity,
      constraints: record.constraints,
      excessIXCapacity: record.excess_ix_capacity,
      projectId: record.project_id,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    });
    
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATE individual transmission record
router.put('/transmission-interconnection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      site, 
      poiVoltage, 
      excessInjectionCapacity, 
      excessWithdrawalCapacity, 
      constraints, 
      excessIXCapacity,
      notes 
    } = req.body;
    
    const result = await db.query(
      `UPDATE pipeline_dashboard.transmission_interconnection 
       SET site = $1,
           poi_voltage = $2,
           excess_injection_capacity = $3,
           excess_withdrawal_capacity = $4,
           constraints = $5,
           excess_ix_capacity = $6,
           notes = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        site,
        poiVoltage,
        excessInjectionCapacity,
        excessWithdrawalCapacity,
        constraints,
        excessIXCapacity,
        notes || '',
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transmission record not found' });
    }
    
    res.json({
      success: true,
      message: 'Transmission record updated successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update transmission record' });
  }
});

// DELETE transmission record
router.delete('/transmission-interconnection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM pipeline_dashboard.transmission_interconnection WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transmission record not found' });
    }
    
    res.json({
      success: true,
      message: 'Transmission record deleted successfully',
      deletedId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete transmission record' });
  }
});

// HEALTH CHECK for this router
router.get('/transmission-health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Transmission Interconnection API',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /transmission-interconnection?project=Dartmouth',
      'POST /transmission-interconnection',
      'GET /transmission-interconnection/:id',
      'PUT /transmission-interconnection/:id',
      'DELETE /transmission-interconnection/:id'
    ]
  });
});

module.exports = router;
