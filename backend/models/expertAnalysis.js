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
        SELECT 
          id,
          project_codename,
          project_name,
          overall_project_score,
          thermal_operating_score,
          redevelopment_score,
          COALESCE(infra, 0) as infra,
          COALESCE(thermal_optimization, 0) as thermal_optimization,
          COALESCE(environmental_score, 0) as environmental_score,
          COALESCE(markets_score, 0) as markets_score,
          COALESCE(ix, 0) as ix,
          COALESCE(land_availability, 0) as land_availability,
          COALESCE(utilities, 0) as utilities,
          created_at,
          updated_at
        FROM ${schema}.expert_analysis 
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
        redevelopmentScore: expertAnalysis.redevelopment_score,
        infra: expertAnalysis.infra,
        thermal_optimization: expertAnalysis.thermal_optimization,
        environmental_score: expertAnalysis.environmental_score,
        markets_score: expertAnalysis.markets_score,
        ix: expertAnalysis.ix
      });
      
      // Create breakdown objects with ACTUAL values from database
      expertAnalysis.thermal_breakdown = {
        thermal_optimization: { 
          score: parseFloat(expertAnalysis.thermal_optimization) || 0 
        },
        environmental: { 
          score: parseFloat(expertAnalysis.environmental_score) || 0 
        }
      };
      
      expertAnalysis.redevelopment_breakdown = {
        redev_market: { 
          score: parseFloat(expertAnalysis.markets_score) || 0 
        },
        interconnection: { 
          score: parseFloat(expertAnalysis.ix) || 0 
        },
        land_availability: { 
          score: parseFloat(expertAnalysis.land_availability) || 0 
        },
        utilities: { 
          score: parseFloat(expertAnalysis.utilities) || 0 
        }
      };
      
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
      
      // Extract breakdown scores with proper defaults
      const thermalOptimizationScore = thermalBreakdown?.thermal_optimization?.score !== undefined 
        ? parseFloat(thermalBreakdown.thermal_optimization.score) 
        : 0;
      const environmentalScore = thermalBreakdown?.environmental?.score !== undefined 
        ? parseFloat(thermalBreakdown.environmental.score) 
        : 0;
      const marketScore = redevelopmentBreakdown?.redev_market?.score !== undefined 
        ? parseFloat(redevelopmentBreakdown.redev_market.score) 
        : 0;
      const interconnectionScore = redevelopmentBreakdown?.interconnection?.score !== undefined 
        ? parseFloat(redevelopmentBreakdown.interconnection.score) 
        : 0;
      const landAvailabilityScore = redevelopmentBreakdown?.land_availability?.score !== undefined 
        ? parseFloat(redevelopmentBreakdown.land_availability.score) 
        : 0;
      const utilitiesScore = redevelopmentBreakdown?.utilities?.score !== undefined 
        ? parseFloat(redevelopmentBreakdown.utilities.score) 
        : 0;
      
      console.log('📊 Breakdown scores extracted:', {
        thermalOptimization: thermalOptimizationScore,
        environmental: environmentalScore,
        market: marketScore,
        interconnection: interconnectionScore,
        land_availability: landAvailabilityScore,
        utilities: utilitiesScore
      });
      
      // Check if record exists
      const checkQuery = `
        SELECT id FROM ${schema}.expert_analysis 
        WHERE project_codename = $1
        LIMIT 1
      `;
      
      const checkResult = await client.query(checkQuery, [actualProjectCodename]);
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Update existing record - USE CORRECT COLUMN NAMES
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
            land_availability = $11,
            utilities = $12,
            updated_at = NOW()
          WHERE project_codename = $1
          RETURNING *
        `;
        
        const values = [
          actualProjectCodename,
          actualProjectName,
          overallScore || 0,
          thermalScore || 0,
          redevelopmentScore || 0,
          infrastructureScore || 0,
          thermalOptimizationScore,
          environmentalScore,
          marketScore,
          interconnectionScore,
          landAvailabilityScore,
          utilitiesScore
        ];
        
        console.log('🔄 Updating expert analysis with values:', values);
        result = await client.query(updateQuery, values);
        console.log(`🔄 Updated expert analysis for project codename "${actualProjectCodename}"`);
      } else {
        // Create new record - USE CORRECT COLUMN NAMES
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
            land_availability,
            utilities,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          RETURNING *
        `;
        
        const values = [
          actualProjectCodename,
          actualProjectName,
          overallScore || 0,
          thermalScore || 0,
          redevelopmentScore || 0,
          infrastructureScore || 0,
          thermalOptimizationScore,
          environmentalScore,
          marketScore,
          interconnectionScore,
          landAvailabilityScore,
          utilitiesScore
        ];
        
        console.log('✅ Creating new expert analysis with values:', values);
        result = await client.query(insertQuery, values);
        console.log(`✅ Created new expert analysis for project codename "${actualProjectCodename}"`);
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
        interconnection: { score: parseFloat(savedAnalysis.ix) || 0 },
        land_availability: { score: parseFloat(savedAnalysis.land_availability) || 0 },
        utilities: { score: parseFloat(savedAnalysis.utilities) || 0 }
      };
      
      console.log('✅ Save completed, returning data:', {
        projectCodename: savedAnalysis.project_codename,
        overallScore: savedAnalysis.overall_project_score,
        thermalScore: savedAnalysis.thermal_operating_score,
        redevelopmentScore: savedAnalysis.redevelopment_score,
        marketsScore: savedAnalysis.markets_score,
        ix: savedAnalysis.ix,
        land_availability: savedAnalysis.land_availability,
        utilities: savedAnalysis.utilities
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
        SELECT 
          id,
          project_codename,
          project_name,
          overall_project_score,
          thermal_operating_score,
          redevelopment_score,
          COALESCE(infra, 0) as infra,
          COALESCE(thermal_optimization, 0) as thermal_optimization,
          COALESCE(environmental_score, 0) as environmental_score,
          COALESCE(markets_score, 0) as markets_score,
          COALESCE(ix, 0) as ix,
          COALESCE(land_availability, 0) as land_availability,
          COALESCE(utilities, 0) as utilities,
          created_at,
          updated_at
        FROM ${schema}.expert_analysis 
        ORDER BY overall_project_score DESC NULLS LAST, updated_at DESC
      `;
      
      const result = await pool.query(query);
      console.log(`✅ Found ${result.rows.length} expert analysis records`);
      
      // Add breakdown data to each row
      return result.rows.map(row => {
        row.thermal_breakdown = {
          thermal_optimization: { score: parseFloat(row.thermal_optimization) || 0 },
          environmental: { score: parseFloat(row.environmental_score) || 0 }
        };
        
        row.redevelopment_breakdown = {
          redev_market: { score: parseFloat(row.markets_score) || 0 },
          interconnection: { score: parseFloat(row.ix) || 0 },
          land_availability: { score: parseFloat(row.land_availability) || 0 },
          utilities: { score: parseFloat(row.utilities) || 0 }
        };
        
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
    if (score === null || score === undefined) return 'N/A';
    
    const numericScore = parseFloat(score) || 0;
    const percent = (numericScore / 6) * 100;
    
    if (percent >= 85) return 'STRONG';
    if (percent >= 70) return 'GOOD';
    if (percent >= 50) return 'FAIR';
    return 'POOR';
  }
}

module.exports = ExpertAnalysis;
