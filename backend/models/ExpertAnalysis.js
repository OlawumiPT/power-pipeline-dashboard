const database = require('../utils/db');
const pool = database.getPool();

class ExpertAnalysis {
  // ========== EXPERT ANALYSIS OPERATIONS ==========

  static async getExpertAnalysisByProjectId(projectId) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      const query = `
        SELECT 
          ea.*,
          p.project_name as actual_project_name,
          p.project_codename,
          p.overall_project_score as project_overall_score,
          p.thermal_operating_score as project_thermal_score,
          p.redevelopment_score as project_redev_score,
          p.iso,
          p.plant_owner,
          p.location,
          p.legacy_nameplate_capacity_mw,
          p.tech
        FROM ${schema}.expert_analysis ea
        LEFT JOIN ${schema}.projects p ON ea.project_id::varchar = p.id::varchar
        WHERE ea.project_id = $1 
        AND p.is_active = true
        LIMIT 1
      `;
      
      console.log('🔍 Fetching expert analysis for project ID:', projectId);
      
      const result = await pool.query(query, [projectId]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No expert analysis found for project ID ${projectId}`);
        return null;
      }
      
      const expertAnalysis = result.rows[0];
      
      // Ensure scores are properly formatted
      expertAnalysis.overall_score = parseFloat(expertAnalysis.overall_score) || 0;
      expertAnalysis.thermal_score = parseFloat(expertAnalysis.thermal_score) || 0;
      expertAnalysis.redevelopment_score = parseFloat(expertAnalysis.redevelopment_score) || 0;
      expertAnalysis.infrastructure_score = parseFloat(expertAnalysis.infrastructure_score) || 0;
      
      // Parse JSONB fields if needed
      if (expertAnalysis.thermal_breakdown && typeof expertAnalysis.thermal_breakdown === 'string') {
        try {
          expertAnalysis.thermal_breakdown = JSON.parse(expertAnalysis.thermal_breakdown);
        } catch (error) {
          console.warn('Failed to parse thermal_breakdown JSON:', error);
        }
      }
      
      if (expertAnalysis.redevelopment_breakdown && typeof expertAnalysis.redevelopment_breakdown === 'string') {
        try {
          expertAnalysis.redevelopment_breakdown = JSON.parse(expertAnalysis.redevelopment_breakdown);
        } catch (error) {
          console.warn('Failed to parse redevelopment_breakdown JSON:', error);
        }
      }
      
      console.log(`✅ Found expert analysis for project ID ${projectId}`);
      return expertAnalysis;
    } catch (error) {
      console.error('❌ Error in getExpertAnalysisByProjectId:', error);
      throw new Error(`Failed to fetch expert analysis: ${error.message}`);
    }
  }

  static async saveExpertAnalysis(analysisData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('📥 Received expert analysis data:', {
        projectId: analysisData.projectId,
        projectName: analysisData.projectName?.substring(0, 50) + '...',
        overallScore: analysisData.overallScore,
        overallRating: analysisData.overallRating
      });
      
      const {
        projectId,
        projectName,
        overallScore,
        overallRating,
        confidence,
        thermalScore,
        thermalBreakdown,
        redevelopmentScore,
        redevelopmentBreakdown,
        infrastructureScore,
        editedBy = 'PowerTrans Team'
      } = analysisData;
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      // Check if expert analysis already exists
      const checkQuery = `
        SELECT id FROM ${schema}.expert_analysis 
        WHERE project_id = $1
        LIMIT 1
      `;
      
      const checkResult = await client.query(checkQuery, [projectId]);
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing
        const updateQuery = `
          UPDATE ${schema}.expert_analysis
          SET 
            project_name = $2,
            overall_score = $3,
            overall_rating = $4,
            confidence = $5,
            thermal_score = $6,
            thermal_breakdown = $7,
            redevelopment_score = $8,
            redevelopment_breakdown = $9,
            infrastructure_score = $10,
            edited_by = $11,
            edited_at = NOW(),
            updated_at = NOW()
          WHERE project_id = $1
          RETURNING *
        `;
        
        const values = [
          projectId,
          projectName || `Project ${projectId}`,
          parseFloat(overallScore) || 0,
          overallRating || 'N/A',
          parseInt(confidence) || 0,
          parseFloat(thermalScore) || 0,
          thermalBreakdown ? JSON.stringify(thermalBreakdown) : '{}',
          parseFloat(redevelopmentScore) || 0,
          redevelopmentBreakdown ? JSON.stringify(redevelopmentBreakdown) : '{}',
          parseFloat(infrastructureScore) || 0,
          editedBy
        ];
        
        console.log('🔄 Updating expert analysis with values:', values);
        result = await client.query(updateQuery, values);
        console.log(`🔄 Updated expert analysis for project ID ${projectId}`);
      } else {
        // Create new
        const insertQuery = `
          INSERT INTO ${schema}.expert_analysis (
            project_id,
            project_name,
            overall_score,
            overall_rating,
            confidence,
            thermal_score,
            thermal_breakdown,
            redevelopment_score,
            redevelopment_breakdown,
            infrastructure_score,
            edited_by,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          RETURNING *
        `;
        
        const values = [
          projectId,
          projectName || `Project ${projectId}`,
          parseFloat(overallScore) || 0,
          overallRating || 'N/A',
          parseInt(confidence) || 0,
          parseFloat(thermalScore) || 0,
          thermalBreakdown ? JSON.stringify(thermalBreakdown) : '{}',
          parseFloat(redevelopmentScore) || 0,
          redevelopmentBreakdown ? JSON.stringify(redevelopmentBreakdown) : '{}',
          parseFloat(infrastructureScore) || 0,
          editedBy
        ];
        
        console.log('✅ Creating new expert analysis with values:', values);
        result = await client.query(insertQuery, values);
        console.log(`✅ Created new expert analysis for project ID ${projectId}`);
      }
      
      await client.query('COMMIT');
      
      const savedAnalysis = result.rows[0];
      
      // Parse JSONB fields for response
      if (savedAnalysis.thermal_breakdown && typeof savedAnalysis.thermal_breakdown === 'string') {
        try {
          savedAnalysis.thermal_breakdown = JSON.parse(savedAnalysis.thermal_breakdown);
        } catch (error) {
          console.warn('Failed to parse thermal_breakdown JSON in response:', error);
        }
      }
      
      if (savedAnalysis.redevelopment_breakdown && typeof savedAnalysis.redevelopment_breakdown === 'string') {
        try {
          savedAnalysis.redevelopment_breakdown = JSON.parse(savedAnalysis.redevelopment_breakdown);
        } catch (error) {
          console.warn('Failed to parse redevelopment_breakdown JSON in response:', error);
        }
      }
      
      return savedAnalysis;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error in saveExpertAnalysis:', error);
      throw new Error(`Failed to save expert analysis: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // ========== TRANSMISSION INTERCONNECTION OPERATIONS ==========

  static async getTransmissionInterconnectionByProject(projectName) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      const query = `
        SELECT 
          ti.*,
          p.project_name as actual_project_name,
          p.project_codename,
          p.iso,
          p.plant_owner
        FROM ${schema}.transmission_interconnection ti
        LEFT JOIN ${schema}.projects p ON ti.site = p.project_name
        WHERE (ti.site ILIKE $1 OR p.project_name ILIKE $1 OR p.project_codename ILIKE $1)
        AND p.is_active = true
        ORDER BY ti.created_at DESC
      `;
      
      console.log('🔍 Fetching transmission data for project:', projectName);
      
      const result = await pool.query(query, [`%${projectName}%`]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No transmission data found for project ${projectName}`);
        return [];
      }
      
      console.log(`✅ Found ${result.rows.length} transmission records for project ${projectName}`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error in getTransmissionInterconnectionByProject:', error);
      throw new Error(`Failed to fetch transmission data: ${error.message}`);
    }
  }

  static async getTransmissionInterconnectionByProjectId(projectId) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      const query = `
        SELECT ti.*, p.project_name as actual_project_name
        FROM ${schema}.transmission_interconnection ti
        LEFT JOIN ${schema}.projects p ON ti.project_id = p.id::varchar
        WHERE ti.project_id = $1 
        AND p.is_active = true
        ORDER BY ti.created_at DESC
      `;
      
      const result = await pool.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error in getTransmissionInterconnectionByProjectId:', error);
      throw new Error(`Failed to fetch transmission data: ${error.message}`);
    }
  }

  static async saveTransmissionInterconnection(projectId, transmissionData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('📥 Saving transmission data for project ID:', projectId);
      console.log('📥 Transmission data count:', transmissionData?.length || 0);
      
      if (!projectId || !Array.isArray(transmissionData)) {
        throw new Error('Project ID and transmission data array are required');
      }
      
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      // First, get the project details
      const projectQuery = `
        SELECT project_name, project_codename FROM ${schema}.projects
        WHERE id = $1 AND is_active = true
        LIMIT 1
      `;
      
      const projectResult = await client.query(projectQuery, [projectId]);
      
      if (projectResult.rows.length === 0) {
        throw new Error(`Project with ID ${projectId} not found or inactive`);
      }
      
      const projectName = projectResult.rows[0].project_name;
      const projectCodename = projectResult.rows[0].project_codename;
      
      console.log(`📋 Found project: ${projectName} (${projectCodename})`);
      
      // Insert new transmission data
      if (transmissionData.length > 0) {
        const insertPromises = transmissionData.map(async (item) => {
          const insertQuery = `
            INSERT INTO ${schema}.transmission_interconnection (
              site,
              poi_voltage,
              excess_injection_capacity,
              excess_withdrawal_capacity,
              constraints,
              excess_ix_capacity,
              project_id,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (site, poi_voltage, project_id) 
            DO UPDATE SET
              excess_injection_capacity = EXCLUDED.excess_injection_capacity,
              excess_withdrawal_capacity = EXCLUDED.excess_withdrawal_capacity,
              constraints = EXCLUDED.constraints,
              excess_ix_capacity = EXCLUDED.excess_ix_capacity,
              updated_at = NOW()
            RETURNING *
          `;
          
          const values = [
            item.site || projectName,
            item.poiVoltage || '',
            parseFloat(item.excessInjectionCapacity) || 0,
            parseFloat(item.excessWithdrawalCapacity) || 0,
            item.constraints || '-',
            item.excessIXCapacity !== undefined ? item.excessIXCapacity : true,
            projectId
          ];
          
          console.log('📝 Inserting transmission record:', {
            site: values[0],
            poiVoltage: values[1],
            injection: values[2],
            withdrawal: values[3]
          });
          
          return client.query(insertQuery, values);
        });
        
        const results = await Promise.all(insertPromises);
        const savedData = results.map(result => result.rows[0]);
        
        console.log(`✅ Saved/updated ${savedData.length} transmission records for project ID ${projectId}`);
        
        await client.query('COMMIT');
        
        return savedData;
      } else {
        // No data to insert
        console.log(`📭 No transmission data to save for project ID ${projectId}`);
        await client.query('COMMIT');
        return [];
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error in saveTransmissionInterconnection:', error);
      throw new Error(`Failed to save transmission data: ${error.message}`);
    } finally {
      client.release();
    }
  }

  static async checkExpertAnalysisExists(projectName) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM ${schema}.expert_analysis ea
          JOIN ${schema}.projects p ON ea.project_id = p.id::varchar
          WHERE p.project_name ILIKE $1 
          OR p.project_codename ILIKE $1
          AND p.is_active = true
        ) as exists
      `;
      
      const result = await pool.query(query, [`%${projectName}%`]);
      return result.rows[0].exists;
    } catch (error) {
      console.error('❌ Error in checkExpertAnalysisExists:', error);
      return false;
    }
  }
}

module.exports = ExpertAnalysis;
