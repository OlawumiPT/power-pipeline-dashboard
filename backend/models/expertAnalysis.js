const database = require('../utils/db');
const pool = database.getPool();

class ExpertAnalysis {
  // ========== EXPERT ANALYSIS OPERATIONS ==========

  static async getExpertAnalysisByProjectId(projectId) {const database = require('../utils/db');
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
        LEFT JOIN ${schema}.projects p ON ea.project_codename = p.project_codename
        WHERE ea.project_codename = $1 
        AND p.is_active = true
        LIMIT 1
      `;
      
      console.log('🔍 Fetching expert analysis for project codename:', projectId);
      
      const result = await pool.query(query, [projectId]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No expert analysis found for project codename ${projectId}`);
        return null;
      }
      
      const expertAnalysis = result.rows[0];
      
      // Ensure scores are properly formatted
      expertAnalysis.overall_project_score = parseFloat(expertAnalysis.overall_project_score) || 0;
      expertAnalysis.thermal_operating_score = parseFloat(expertAnalysis.thermal_operating_score) || 0;
      expertAnalysis.redevelopment_score = parseFloat(expertAnalysis.redevelopment_score) || 0;
      expertAnalysis.infra = parseFloat(expertAnalysis.infra) || 0;
      
      // Parse breakdowns from individual columns
      expertAnalysis.thermal_breakdown = {
        thermal_optimization: { score: parseFloat(expertAnalysis.thermal_optimization) || 0 },
        environmental: { score: parseFloat(expertAnalysis.environmental_score) || 0 }
      };
      
      expertAnalysis.redevelopment_breakdown = {
        redev_market: { score: parseFloat(expertAnalysis.markets_score) || 0 },
        land_availability: { score: 0 },
        utilities: { score: 0 },
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
      
      console.log('📥 Received expert analysis data:', {
        projectId: analysisData.projectId,
        projectName: analysisData.projectName?.substring(0, 50) + '...',
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
      
      // Extract breakdown scores
      const thermalOptimizationScore = thermalBreakdown?.thermal_optimization?.score || 0;
      const environmentalScore = thermalBreakdown?.environmental?.score || 0;
      const marketScore = redevelopmentBreakdown?.redev_market?.score || 0;
      const interconnectionScore = redevelopmentBreakdown?.interconnection?.score || 0;
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing - MATCHING YOUR TABLE COLUMNS
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
        // Create new - MATCHING YOUR TABLE COLUMNS
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
        land_availability: { score: 0 },
        utilities: { score: 0 },
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
          JOIN ${schema}.projects p ON ea.project_codename = p.project_codename
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
        LEFT JOIN ${schema}.projects p ON ea.project_codename = p.project_codename
        WHERE ea.project_codename = $1 
        AND p.is_active = true
        LIMIT 1
      `;
      
      console.log('🔍 Fetching expert analysis for project codename:', projectId);
      
      const result = await pool.query(query, [projectId]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No expert analysis found for project codename ${projectId}`);
        return null;
      }
      
      const expertAnalysis = result.rows[0];
      
      // Ensure scores are properly formatted
      expertAnalysis.overall_project_score = parseFloat(expertAnalysis.overall_project_score) || 0;
      expertAnalysis.thermal_operating_score = parseFloat(expertAnalysis.thermal_operating_score) || 0;
      expertAnalysis.redevelopment_score = parseFloat(expertAnalysis.redevelopment_score) || 0;
      expertAnalysis.infrastructure_score = expertAnalysis.infra || 0; // infra column in your table
      
      // Parse breakdowns from individual columns
      expertAnalysis.thermal_breakdown = {
        thermal_optimization: { score: expertAnalysis.thermal_optimization || 0 },
        environmental: { score: expertAnalysis.environmental_score || 0 }
      };
      
      expertAnalysis.redevelopment_breakdown = {
        redev_market: { score: expertAnalysis.markets_score || 0 },
        land_availability: { score: 0 }, // Not in your table
        utilities: { score: 0 }, // Not in your table
        interconnection: { score: expertAnalysis.ix || 0 }
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
      
      console.log('📥 Received expert analysis data:', {
        projectId: analysisData.projectId,
        projectName: analysisData.projectName?.substring(0, 50) + '...',
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
        infrastructureScore,
        editedBy = 'PowerTrans Team'
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
      
      // Extract breakdown scores
      const thermalOptimizationScore = thermalBreakdown?.thermal_optimization?.score || 0;
      const environmentalScore = thermalBreakdown?.environmental?.score || 0;
      const marketScore = redevelopmentBreakdown?.redev_market?.score || 0;
      const interconnectionScore = redevelopmentBreakdown?.interconnection?.score || 0;
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing - MATCHING YOUR TABLE COLUMNS
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
            edited_at = NOW(),
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
        // Create new - MATCHING YOUR TABLE COLUMNS
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
        thermal_optimization: { score: savedAnalysis.thermal_optimization || 0 },
        environmental: { score: savedAnalysis.environmental_score || 0 }
      };
      
      savedAnalysis.redevelopment_breakdown = {
        redev_market: { score: savedAnalysis.markets_score || 0 },
        land_availability: { score: 0 },
        utilities: { score: 0 },
        interconnection: { score: savedAnalysis.ix || 0 }
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
          JOIN ${schema}.projects p ON ea.project_codename = p.project_codename
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
