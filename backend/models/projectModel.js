const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'pipeline_dashboard',
  user: process.env.DB_USER || 'dashboard_admin',
  password: process.env.DB_PASSWORD || 'powertransition',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 5000, // How long to wait for a connection
});

// Test database connection on startup
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// ========== PROJECT DATA OPERATIONS ==========

/**
 * Get all projects with optional filtering
 */
const getAllProjects = async (filters = {}) => {
  const {
    iso,
    process_type,
    plant_owner,
    status,
    tech,
    project_type,
    limit = 1000,
    offset = 0,
    sort_by = 'project_name',
    sort_order = 'ASC'
  } = filters;

  try {
    let query = `
      SELECT 
        id,
        excel_row_id,
        plant_owner,
        project_codename,
        project_name,
        overall_project_score,
        thermal_operating_score,
        redevelopment_score,
        redevelopment_load_score,
        ic_score,
        process_type,
        number_of_sites,
        legacy_nameplate_capacity_mw,
        tech,
        heat_rate_btu_kwh,
        capacity_factor_2024,
        legacy_cod,
        gas_reference,
        redev_tier,
        redevelopment_base_case,
        redev_capacity_mw,
        redev_tech,
        redev_fuel,
        redev_heatrate_btu_kwh,
        redev_cod,
        redev_land_control,
        redev_stage_gate,
        redev_lead,
        redev_support,
        contact,
        iso,
        zone_submarket,
        location,
        site_acreage,
        fuel,
        plant_cod,
        capacity_factor,
        markets,
        thermal_optimization,
        environmental_score,
        market_score,
        infra,
        ix,
        co_locate_repower,
        transactability_scores,
        transactability,
        project_type,
        status,
        overall_score,
        thermal_score,
        redev_score,
        mw,
        hr,
        cf,
        mkt,
        zone,
        created_at,
        updated_at,
        created_by,
        updated_by,
        is_active
      FROM pipeline_dashboard.projects
      WHERE is_active = true
    `;
    
    const values = [];
    let paramCount = 1;

    // Apply filters dynamically
    if (iso && iso !== 'All') {
      query += ` AND iso = $${paramCount}`;
      values.push(iso);
      paramCount++;
    }

    if (process_type && process_type !== 'All') {
      query += ` AND process_type = $${paramCount}`;
      values.push(process_type === 'Process' ? 'P' : 'B');
      paramCount++;
    }

    if (plant_owner && plant_owner !== 'All') {
      query += ` AND plant_owner = $${paramCount}`;
      values.push(plant_owner);
      paramCount++;
    }

    if (status && status !== 'All') {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (tech && tech !== 'All') {
      query += ` AND (tech ILIKE $${paramCount} OR redev_tech ILIKE $${paramCount})`;
      values.push(`%${tech}%`);
      paramCount++;
    }

    if (project_type && project_type !== 'All') {
      query += ` AND project_type ILIKE $${paramCount}`;
      values.push(`%${project_type}%`);
      paramCount++;
    }

    // Validate and apply sorting
    const validSortColumns = [
      'id', 'project_name', 'project_codename', 'plant_owner', 'iso', 
      'overall_score', 'thermal_score', 'redev_score', 'mw', 'hr', 'cf', 
      'status', 'created_at', 'updated_at'
    ];
    
    const safeSortBy = validSortColumns.includes(sort_by.toLowerCase()) 
      ? sort_by 
      : 'project_name';
    
    const safeSortOrder = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
    
    // Add pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit), parseInt(offset));

    console.log('📊 Executing query with params:', { query: query.substring(0, 200) + '...', values });
    
    const result = await pool.query(query, values);
    console.log(`✅ Retrieved ${result.rows.length} projects`);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error in getAllProjects:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }
};

/**
 * Get single project by ID
 */
const getProjectById = async (id) => {
  try {
    const query = `
      SELECT * FROM pipeline_dashboard.projects 
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in getProjectById:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }
};

/**
 * Get single project by name or codename
 */
const getProjectByName = async (name) => {
  try {
    const query = `
      SELECT * FROM pipeline_dashboard.projects 
      WHERE (project_name = $1 OR project_codename = $1) 
      AND is_active = true
      LIMIT 1
    `;
    
    const result = await pool.query(query, [name]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error in getProjectByName:', error);
    throw new Error(`Failed to fetch project by name: ${error.message}`);
  }
};

/**
 * Create new project
 */
/**
 * Create new project
 */
const createProject = async (projectData) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📥 Received project data:', projectData);
    
    // Build dynamic columns and values
    const columns = [];
    const placeholders = [];
    const values = [];
    let paramCount = 1;

    // Add provided fields
    for (const [key, value] of Object.entries(projectData)) {
      // Skip generated columns and ID
      if (!['id', 'mw', 'hr', 'cf', 'mkt', 'zone'].includes(key)) {
        columns.push(key);
        placeholders.push(`$${paramCount}`);
        
        // Handle empty strings and convert to null for database
        if (value === '' || value === null || value === undefined) {
          values.push(null);
        } else {
          values.push(value);
        }
        
        paramCount++;
      }
    }

    // Add audit columns with string values in quotes
    columns.push('created_at', 'updated_at', 'created_by', 'updated_by', 'is_active');
    placeholders.push('NOW()', 'NOW()', '$' + paramCount, '$' + (paramCount + 1), '$' + (paramCount + 2));
    values.push('system', 'system', true);
    paramCount += 3;

    const query = `
      INSERT INTO pipeline_dashboard.projects (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    console.log('📝 SQL Query:', query);
    console.log('📝 Values:', values);
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    console.log(`✅ Created new project: ${result.rows[0].project_name}`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in createProject:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Update existing project
 */
const updateProject = async (id, updates) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if project exists
    const checkQuery = `SELECT id FROM pipeline_dashboard.projects WHERE id = $1 AND is_active = true`;
    const checkResult = await client.query(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      throw new Error('Project not found or inactive');
    }
    
    // Build SET clauses
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    console.log('🔄 Updates received:', updates);
    
    for (const [key, value] of Object.entries(updates)) {
      // Skip generated columns and ID
      if (!['id', 'mw', 'hr', 'cf', 'mkt', 'zone'].includes(key)) {
        setClauses.push(`${key} = $${paramCount}`);
        
        // Convert empty strings to null for database
        if (value === '' || value === null || value === undefined) {
          values.push(null);
        } else {
          values.push(value);
        }
        
        paramCount++;
      }
    }

    // Add updated timestamp - IMPORTANT: These should NOT be parameters
    setClauses.push('updated_at = NOW()');
    setClauses.push(`updated_by = 'api'`);
    // Don't increment paramCount for these since they're not parameters

    // Add WHERE clause - id will be the next parameter
    values.push(id);
    
    const query = `
      UPDATE pipeline_dashboard.projects
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    console.log('📝 Update Query:', query);
    console.log('📝 Values being sent:', values);
    console.log('📝 Parameter count check:', {
      setClausesCount: setClauses.length,
      valuesCount: values.length,
      paramCount: paramCount,
      expectedWhereParam: paramCount
    });
    
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    
    console.log(`✅ Updated project: ${result.rows[0].project_name}`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in updateProject:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Soft delete project (set is_active = false)
 */
const deleteProject = async (id) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const query = `
      UPDATE pipeline_dashboard.projects
      SET is_active = false, updated_at = NOW(), updated_by = 'api'
      WHERE id = $1
      RETURNING id, project_name
    `;

    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }
    
    await client.query('COMMIT');
    
    console.log(`🗑️ Soft deleted project: ${result.rows[0].project_name}`);
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in deleteProject:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Get dashboard statistics
 */
const getDashboardStats = async () => {
  try {
    const queries = {
      // Total counts
      totalProjects: {
        text: `SELECT COUNT(*) as count FROM pipeline_dashboard.projects WHERE is_active = true`,
      },
      
      // ISO distribution
      isoDistribution: {
        text: `SELECT iso, COUNT(*) as count FROM pipeline_dashboard.projects WHERE is_active = true AND iso IS NOT NULL GROUP BY iso ORDER BY count DESC`,
      },
      
      // Technology distribution
      techDistribution: {
        text: `SELECT tech, COUNT(*) as count FROM pipeline_dashboard.projects WHERE is_active = true AND tech IS NOT NULL GROUP BY tech ORDER BY count DESC LIMIT 10`,
      },
      
      // Status distribution
      statusDistribution: {
        text: `SELECT status, COUNT(*) as count FROM pipeline_dashboard.projects WHERE is_active = true AND status IS NOT NULL GROUP BY status ORDER BY count DESC`,
      },
      
      // Owner distribution
      ownerDistribution: {
        text: `SELECT plant_owner, COUNT(*) as count FROM pipeline_dashboard.projects WHERE is_active = true AND plant_owner IS NOT NULL GROUP BY plant_owner ORDER BY count DESC LIMIT 10`,
      },
      
      // Score statistics
      scoreStats: {
        text: `SELECT 
          ROUND(AVG(overall_score)::numeric, 2) as avg_overall,
          ROUND(AVG(thermal_score)::numeric, 2) as avg_thermal,
          ROUND(AVG(redev_score)::numeric, 2) as avg_redev,
          ROUND(SUM(mw)::numeric, 2) as total_mw,
          COUNT(*) as total_projects
        FROM pipeline_dashboard.projects WHERE is_active = true`,
      },
      
      // Redev type distribution
      redevDistribution: {
        text: `SELECT 
          redev_tech,
          COUNT(*) as count,
          ROUND(SUM(redev_capacity_mw)::numeric, 2) as total_capacity
        FROM pipeline_dashboard.projects 
        WHERE is_active = true AND redev_tech IS NOT NULL
        GROUP BY redev_tech 
        ORDER BY count DESC
        LIMIT 10`,
      }
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query.text);
      results[key] = result.rows;
    }
    
    console.log('📊 Dashboard statistics retrieved successfully');
    return results;
  } catch (error) {
    console.error('❌ Error in getDashboardStats:', error);
    throw new Error(`Failed to fetch dashboard statistics: ${error.message}`);
  }
};

/**
 * Get filter options for dropdowns
 */
const getFilterOptions = async () => {
  try {
    const queries = {
      isos: {
        text: `SELECT DISTINCT iso as value FROM pipeline_dashboard.projects WHERE is_active = true AND iso IS NOT NULL AND iso != '' ORDER BY iso`,
      },
      
      owners: {
        text: `SELECT DISTINCT plant_owner as value FROM pipeline_dashboard.projects WHERE is_active = true AND plant_owner IS NOT NULL AND plant_owner != '' ORDER BY plant_owner`,
      },
      
      techs: {
        text: `SELECT DISTINCT tech as value FROM pipeline_dashboard.projects WHERE is_active = true AND tech IS NOT NULL AND tech != '' ORDER BY tech`,
      },
      
      statuses: {
        text: `SELECT DISTINCT status as value FROM pipeline_dashboard.projects WHERE is_active = true AND status IS NOT NULL AND status != '' ORDER BY status`,
      },
      
      projectTypes: {
        text: `SELECT DISTINCT project_type as value FROM pipeline_dashboard.projects WHERE is_active = true AND project_type IS NOT NULL AND project_type != '' ORDER BY project_type`,
      },
      
      processTypes: {
        text: `SELECT DISTINCT process_type as value FROM pipeline_dashboard.projects WHERE is_active = true AND process_type IS NOT NULL AND process_type != '' ORDER BY process_type`,
      }
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query.text);
      results[key] = result.rows.map(row => row.value);
    }
    
    console.log('🔍 Filter options retrieved successfully');
    return results;
  } catch (error) {
    console.error('❌ Error in getFilterOptions:', error);
    throw new Error(`Failed to fetch filter options: ${error.message}`);
  }
};

/**
 * Get projects count for pagination
 */
const getProjectsCount = async (filters = {}) => {
  try {
    let query = `SELECT COUNT(*) as total FROM pipeline_dashboard.projects WHERE is_active = true`;
    
    const values = [];
    let paramCount = 1;

    // Apply same filters as getAllProjects
    if (filters.iso && filters.iso !== 'All') {
      query += ` AND iso = $${paramCount}`;
      values.push(filters.iso);
      paramCount++;
    }

    if (filters.plant_owner && filters.plant_owner !== 'All') {
      query += ` AND plant_owner = $${paramCount}`;
      values.push(filters.plant_owner);
      paramCount++;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total);
  } catch (error) {
    console.error('❌ Error in getProjectsCount:', error);
    throw new Error(`Failed to get projects count: ${error.message}`);
  }
};

// Export all model functions
module.exports = {
  // Core CRUD operations
  getAllProjects,
  getProjectById,
  getProjectByName,
  createProject,
  updateProject,
  deleteProject,
  
  // Dashboard operations
  getDashboardStats,
  getFilterOptions,
  getProjectsCount,
  
  // Utility function to test connection
  testConnection: async () => {
    try {
      const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
      return {
        connected: true,
        timestamp: result.rows[0].current_time,
        version: result.rows[0].db_version
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
};