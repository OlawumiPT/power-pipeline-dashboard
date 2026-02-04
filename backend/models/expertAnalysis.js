const database = require('../utils/db');
const pool = database.getPool();

class ExpertAnalysis {
  // ========== EXPERT ANALYSIS OPERATIONS ==========

  static async getExpertAnalysisByProjectId(projectId) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      console.log('🔍 getExpertAnalysisByProjectId called with projectId:', projectId);
      
      if (!projectId) {
        console.log('❌ Project ID is required but not provided');
        return null;
      }
      
      // FIRST: Check if projectId is a number (projects.id) or string (project_codename)
      let actualProjectCodename = projectId.toString().trim();
      let isNumericId = !isNaN(projectId) && projectId.toString().trim() !== '';
      
      if (isNumericId) {
        // If it's a number, look up the project_codename from projects table
        console.log(`🔍 Project ID ${projectId} appears to be numeric, looking up project_codename...`);
        
        const projectQuery = `
          SELECT project_codename, project_name 
          FROM ${schema}.projects 
          WHERE id = $1 
          LIMIT 1
        `;
        
        const projectResult = await pool.query(projectQuery, [parseInt(projectId)]);
        
        if (projectResult.rows.length === 0) {
          console.log(`📭 No project found with ID ${projectId}`);
          return null;
        }
        
        actualProjectCodename = projectResult.rows[0].project_codename;
        console.log(`✅ Mapped project ID ${projectId} to project_codename: "${actualProjectCodename}"`);
      } else {
        console.log(`🔍 Using provided projectId as project_codename: "${projectId}"`);
      }
      
      // Now query expert_analysis with the actual project_codename
      const query = `
        SELECT * FROM ${schema}.expert_analysis 
        WHERE project_codename = $1 
        LIMIT 1
      `;
      
      const result = await pool.query(query, [actualProjectCodename]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No expert analysis found for project_codename "${actualProjectCodename}"`);
        return null;
      }
      
      const expertAnalysis = result.rows[0];
      
      console.log(`✅ Found expert analysis for "${actualProjectCodename}":`, {
        id: expertAnalysis.id,
        overallScore: expertAnalysis.overall_project_score,
        thermalScore: expertAnalysis.thermal_operating_score,
        redevelopmentScore: expertAnalysis.redevelopment_score
      });
      
      // Only create breakdown objects if values exist in database
      if (expertAnalysis.thermal_optimization !== null || expertAnalysis.environmental_score !== null) {
        expertAnalysis.thermal_breakdown = {
          thermal_optimization: { score: parseFloat(expertAnalysis.thermal_optimization) },
          environmental: { score: parseFloat(expertAnalysis.environmental_score) }
        };
      }
      
      // Determine which market score column exists
      const marketsScore = expertAnalysis.markets_score !== null ? parseFloat(expertAnalysis.markets_score) : null;
      const marketScore = expertAnalysis.market_score !== null ? parseFloat(expertAnalysis.market_score) : null;
      const ixScore = expertAnalysis.ix !== null ? parseFloat(expertAnalysis.ix) : null;
      
      if (marketsScore !== null || marketScore !== null || ixScore !== null) {
        expertAnalysis.redevelopment_breakdown = {
          redev_market: { score: marketsScore || marketScore },
          interconnection: { score: ixScore },
          land_availability: { score: null },
          utilities: { score: null }
        };
      }
      
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
      
      const {
        projectId, // This could be projects.id or project_codename
        projectName,
        overallScore,
        thermalScore,
        thermalBreakdown,
        redevelopmentScore,
        redevelopmentBreakdown,
        infrastructureScore
      } = analysisData;
      
      console.log('💾 saveExpertAnalysis called with:', {
        projectId,
        projectName,
        overallScore,
        thermalScore,
        redevelopmentScore,
        infrastructureScore,
        thermalBreakdown,
        redevelopmentBreakdown
      });
      
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      // Determine if projectId is numeric (projects.id) or string (project_codename)
      let actualProjectCodename = projectId.toString().trim();
      let actualProjectName = projectName;
      let isNumericId = !isNaN(projectId) && projectId.toString().trim() !== '';
      
      if (isNumericId) {
        // Look up project_codename from projects table
        const projectQuery = `
          SELECT project_codename, project_name 
          FROM ${schema}.projects 
          WHERE id = $1 
          LIMIT 1
        `;
        
        const projectResult = await client.query(projectQuery, [parseInt(projectId)]);
        
        if (projectResult.rows.length === 0) {
          throw new Error(`Project with ID ${projectId} not found in projects table`);
        }
        
        actualProjectCodename = projectResult.rows[0].project_codename;
        actualProjectName = projectResult.rows[0].project_name || projectName;
        
        console.log(`✅ Mapped project ID ${projectId} to:`, {
          projectCodename: actualProjectCodename,
          projectName: actualProjectName
        });
      }
      
      // Now use the actual project_codename
      const checkQuery = `
        SELECT id FROM ${schema}.expert_analysis 
        WHERE project_codename = $1
        LIMIT 1
      `;
      
      const checkResult = await client.query(checkQuery, [actualProjectCodename]);
      
      // Extract breakdown scores if provided
      const thermalOptimizationScore = thermalBreakdown?.thermal_optimization?.score !== undefined 
        ? parseFloat(thermalBreakdown.thermal_optimization.score) 
        : null;
      const environmentalScore = thermalBreakdown?.environmental?.score !== undefined 
        ? parseFloat(thermalBreakdown.environmental.score) 
        : null;
      const marketScore = redevelopmentBreakdown?.redev_market?.score !== undefined 
        ? parseFloat(redevelopmentBreakdown.redev_market.score) 
        : null;
      const interconnectionScore = redevelopmentBreakdown?.interconnection?.score !== undefined 
        ? parseFloat(redevelopmentBreakdown.interconnection.score) 
        : null;
      
      console.log('📊 Breakdown scores extracted:', {
        thermalOptimization: thermalOptimizationScore,
        environmental: environmentalScore,
        market: marketScore,
        interconnection: interconnectionScore
      });
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing record
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
          actualProjectCodename,
          actualProjectName,
          overallScore,
          thermalScore,
          redevelopmentScore,
          infrastructureScore,
          thermalOptimizationScore,
          environmentalScore,
          marketScore,
          interconnectionScore
        ];
        
        console.log('🔄 Updating expert analysis with values:', values);
        result = await client.query(updateQuery, values);
        console.log(`🔄 Updated expert analysis for project codename "${actualProjectCodename}"`);
      } else {
        // Create new record
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
          actualProjectCodename,
          actualProjectName,
          overallScore,
          thermalScore,
          redevelopmentScore,
          infrastructureScore,
          thermalOptimizationScore,
          environmentalScore,
          marketScore,
          interconnectionScore
        ];
        
        console.log('✅ Creating new expert analysis with values:', values);
        result = await client.query(insertQuery, values);
        console.log(`✅ Created new expert analysis for project codename "${actualProjectCodename}"`);
      }
      
      await client.query('COMMIT');
      
      const savedAnalysis = result.rows[0];
      
      // Create breakdown objects for response if values exist
      if (savedAnalysis.thermal_optimization !== null || savedAnalysis.environmental_score !== null) {
        savedAnalysis.thermal_breakdown = {
          thermal_optimization: { score: parseFloat(savedAnalysis.thermal_optimization) },
          environmental: { score: parseFloat(savedAnalysis.environmental_score) }
        };
      }
      
      if (savedAnalysis.markets_score !== null || savedAnalysis.ix !== null) {
        savedAnalysis.redevelopment_breakdown = {
          redev_market: { score: parseFloat(savedAnalysis.markets_score) },
          interconnection: { score: parseFloat(savedAnalysis.ix) },
          land_availability: { score: redevelopmentBreakdown?.land_availability?.score || null },
          utilities: { score: redevelopmentBreakdown?.utilities?.score || null }
        };
      }
      
      console.log('✅ Save completed, returning data:', {
        projectCodename: savedAnalysis.project_codename,
        overallScore: savedAnalysis.overall_project_score,
        thermalScore: savedAnalysis.thermal_operating_score,
        redevelopmentScore: savedAnalysis.redevelopment_score,
        marketsScore: savedAnalysis.markets_score,
        ix: savedAnalysis.ix
      });
      
      return savedAnalysis;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error in saveExpertAnalysis:', error);
      throw new Error(`Failed to save expert analysis: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // NEW METHOD: Get all expert analyses
  static async getAllExpertAnalyses() {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      console.log('🔍 Getting ALL expert analyses from database');
      
      const query = `
        SELECT * FROM ${schema}.expert_analysis 
        ORDER BY overall_project_score DESC NULLS LAST, updated_at DESC
      `;
      
      const result = await pool.query(query);
      console.log(`✅ Found ${result.rows.length} expert analysis records`);
      
      // Add breakdown data to each row only if values exist
      return result.rows.map(row => {
        if (row.thermal_optimization !== null || row.environmental_score !== null) {
          row.thermal_breakdown = {
            thermal_optimization: { score: parseFloat(row.thermal_optimization) },
            environmental: { score: parseFloat(row.environmental_score) }
          };
        }
        
        if (row.markets_score !== null || row.ix !== null) {
          row.redevelopment_breakdown = {
            redev_market: { score: parseFloat(row.markets_score) },
            interconnection: { score: parseFloat(row.ix) },
            land_availability: { score: null },
            utilities: { score: null }
          };
        }
        
        return row;
      });
      
    } catch (error) {
      console.error('❌ Error in getAllExpertAnalyses:', error);
      throw new Error(`Failed to fetch all expert analyses: ${error.message}`);
    }
  }

  // ========== TRANSMISSION INTERCONNECTION OPERATIONS ==========

  static async getTransmissionInterconnectionByProject(projectName) {
    try {
      const schema = process.env.DB_SCHEMA || 'pipeline_dashboard';
      
      console.log('🔍 getTransmissionInterconnectionByProject called for:', projectName);
      
      if (!projectName) {
        console.log('❌ Project name is required');
        return [];
      }
      
      const query = `
        SELECT * FROM ${schema}.transmission_interconnection
        WHERE site ILIKE $1
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query, [`%${projectName}%`]);
      
      if (result.rows.length === 0) {
        console.log(`📭 No transmission data found for project "${projectName}"`);
        return [];
      }
      
      console.log(`✅ Found ${result.rows.length} transmission records for project "${projectName}"`);
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
      
      console.log('💾 saveTransmissionInterconnection called with:', {
        projectId,
        dataCount: transmissionData?.length || 0
      });
      
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
            item.excessInjectionCapacity !== undefined ? parseFloat(item.excessInjectionCapacity) : null,
            item.excessWithdrawalCapacity !== undefined ? parseFloat(item.excessWithdrawalCapacity) : null,
            item.constraints || null,
            item.excessIXCapacity !== undefined ? item.excessIXCapacity : null,
            projectId
          ];
          
          return client.query(insertQuery, values);
        });
        
        const results = await Promise.all(insertPromises);
        const savedData = results.map(result => result.rows[0]);
        
        console.log(`✅ Saved/updated ${savedData.length} transmission records for project "${projectName}"`);
        
        await client.query('COMMIT');
        
        return savedData;
      } else {
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

  // Helper function to calculate rating based on score
  static calculateRating(score) {
    if (score === null || score === undefined) return null;
    
    const numericScore = parseFloat(score) || 0;
    const percent = (numericScore / 6) * 100;
    
    if (percent >= 85) return 'STRONG';
    if (percent >= 70) return 'GOOD';
    if (percent >= 50) return 'FAIR';
    return 'POOR';
  }
}

module.exports = ExpertAnalysis;
