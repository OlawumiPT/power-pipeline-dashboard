const database = require('../utils/db');
const pool = database.getPool();

class ExpertAnalysis {
  // ========== EXPERT ANALYSIS OPERATIONS ==========

  static async getExpertAnalysisByProjectId(projectId) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      const query = `
        SELECT * FROM ${schema}.expert_analysis 
        WHERE project_codename = $1 
        LIMIT 1
      `;
      
      console.log('🔍 Fetching expert analysis for project codename:', projectId);
      
      const result = await pool.query(query, [projectId]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No expert analysis found for project codename ${projectId}`);
        return null;
      }
      
      const expertAnalysis = result.rows[0];
      
      // Create breakdown objects from individual columns
      expertAnalysis.thermal_breakdown = {
        thermal_optimization: { score: parseFloat(expertAnalysis.thermal_optimization) || 0 },
        environmental: { score: parseFloat(expertAnalysis.environmental_score) || 0 }
      };
      
      expertAnalysis.redevelopment_breakdown = {
        redev_market: { score: parseFloat(expertAnalysis.markets_score) || 0 },
        interconnection: { score: parseFloat(expertAnalysis.ix) || 0 }
      };
      
      console.log(`✅ Found expert analysis for project codename ${projectId}`);
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
      
      console.log('📥 Saving expert analysis data:', {
        projectId: analysisData.projectId,
        overallScore: analysisData.overallScore,
        thermalScore: analysisData.thermalScore,
        redevelopmentScore: analysisData.redevelopmentScore
      });
      
      const {
        projectId,
        projectName,
        overallScore,
        thermalScore,
        thermalBreakdown,
        redevelopmentScore,
        redevelopmentBreakdown,
        infrastructureScore
      } = analysisData;
      
      if (!projectId) {
        throw new Error('Project codename is required');
      }
      
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      // Check if expert analysis already exists
      const checkQuery = `
        SELECT id FROM ${schema}.expert_analysis 
        WHERE project_codename = $1
        LIMIT 1
      `;
      
      const checkResult = await client.query(checkQuery, [projectId]);
      
      // Extract breakdown scores from the breakdown objects
      const thermalOptimizationScore = thermalBreakdown?.thermal_optimization?.score || 0;
      const environmentalScore = thermalBreakdown?.environmental?.score || 0;
      const marketScore = redevelopmentBreakdown?.redev_market?.score || 0;
      const interconnectionScore = redevelopmentBreakdown?.interconnection?.score || 0;
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing - ONLY columns that exist in your table
        const updateQuery = `
          UPDATE ${schema}.expert_analysis
          SET 
            project_name = $2,
            overall_project_score = $3,
            thermal_operating_score = $4,
            redevelopment_score = $5,
            infra = $6,
            thermal_optimization = $7,
            environmental_score = $8,
            markets_score = $9,
            ix = $10,
            updated_at = NOW()
          WHERE project_codename = $1
          RETURNING *
        `;
        
        const values = [
          projectId,
          projectName || `Project ${projectId}`,
          parseFloat(overallScore) || 0,
          parseFloat(thermalScore) || 0,
          parseFloat(redevelopmentScore) || 0,
          parseFloat(infrastructureScore) || 0,
          parseFloat(thermalOptimizationScore) || 0,
          parseFloat(environmentalScore) || 0,
          parseFloat(marketScore) || 0,
          parseFloat(interconnectionScore) || 0
        ];
        
        console.log('🔄 Updating expert analysis with values:', values);
        result = await client.query(updateQuery, values);
        console.log(`🔄 Updated expert analysis for project codename ${projectId}`);
      } else {
        // Create new - ONLY columns that exist in your table
        const insertQuery = `
          INSERT INTO ${schema}.expert_analysis (
            project_codename,
            project_name,
            overall_project_score,
            thermal_operating_score,
            redevelopment_score,
            infra,
            thermal_optimization,
            environmental_score,
            markets_score,
            ix,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING *
        `;
        
        const values = [
          projectId,
          projectName || `Project ${projectId}`,
          parseFloat(overallScore) || 0,
          parseFloat(thermalScore) || 0,
          parseFloat(redevelopmentScore) || 0,
          parseFloat(infrastructureScore) || 0,
          parseFloat(thermalOptimizationScore) || 0,
          parseFloat(environmentalScore) || 0,
          parseFloat(marketScore) || 0,
          parseFloat(interconnectionScore) || 0
        ];
        
        console.log('✅ Creating new expert analysis with values:', values);
        result = await client.query(insertQuery, values);
        console.log(`✅ Created new expert analysis for project codename ${projectId}`);
      }
      
      await client.query('COMMIT');
      
      const savedAnalysis = result.rows[0];
      
      // Create breakdown objects for response
      savedAnalysis.thermal_breakdown = {
        thermal_optimization: { score: parseFloat(savedAnalysis.thermal_optimization) || 0 },
        environmental: { score: parseFloat(savedAnalysis.environmental_score) || 0 }
      };
      
      savedAnalysis.redevelopment_breakdown = {
        redev_market: { score: parseFloat(savedAnalysis.markets_score) || 0 },
        interconnection: { score: parseFloat(savedAnalysis.ix) || 0 }
      };
      
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
        SELECT * FROM ${schema}.transmission_interconnection
        WHERE site ILIKE $1
        ORDER BY created_at DESC
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

  static async saveTransmissionInterconnection(projectId, transmissionData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      console.log('📥 Saving transmission data for project ID:', projectId);
      
      if (!projectId || !Array.isArray(transmissionData)) {
        throw new Error('Project ID and transmission data array are required');
      }
      
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      // Get project name
      const projectQuery = `
        SELECT project_name FROM ${schema}.projects
        WHERE id = $1 AND is_active = true
        LIMIT 1
      `;
      
      const projectResult = await client.query(projectQuery, [projectId]);
      
      if (projectResult.rows.length === 0) {
        throw new Error(`Project with ID ${projectId} not found`);
      }
      
      const projectName = projectResult.rows[0].project_name;
      
      // Insert transmission data
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
          
          return client.query(insertQuery, values);
        });
        
        const results = await Promise.all(insertPromises);
        const savedData = results.map(result => result.rows[0]);
        
        console.log(`✅ Saved/updated ${savedData.length} transmission records`);
        
        await client.query('COMMIT');
        
        return savedData;
      } else {
        console.log(`📭 No transmission data to save`);
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

  // Helper function to calculate rating based on score
  static calculateRating(score) {
    const percent = (score / 6) * 100;
    if (percent >= 85) return 'STRONG';
    if (percent >= 70) return 'GOOD';
    if (percent >= 50) return 'FAIR';
    return 'POOR';
  }
}

module.exports = ExpertAnalysis;
