const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const emailService = require('../services/emailService');

// Registration endpoint with email validation
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { username, email, password, full_name } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email, and password are required' 
      });
    }
    
    // Validate email domain - ONLY allow @power-transitions.com
    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'power-transitions.com') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only @power-transitions.com email addresses are allowed for registration' 
      });
    }
    
    // Check if user already exists
    const userCheck = await client.query(
      'SELECT id FROM pipeline_dashboard.users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate approval token
    const approvalToken = crypto.randomBytes(32).toString('hex');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Insert user with pending status
    const userResult = await client.query(
      `INSERT INTO pipeline_dashboard.users 
       (username, email, password_hash, full_name, status, role, created_at, approval_token)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
       RETURNING id, username, email, full_name, status, role, created_at`,
      [
        username, 
        email, 
        hashedPassword, 
        full_name || null, 
        'pending_approval', 
        'user', 
        approvalToken
      ]
    );
    
    const newUser = userResult.rows[0];
    
    // Insert audit log
    await client.query(
      `INSERT INTO pipeline_dashboard.audit_logs 
       (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        newUser.id,
        'registration_request',
        JSON.stringify({ 
          username, 
          email, 
          status: 'pending_approval' 
        }),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || 'unknown'
      ]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Send registration email to user
    const emailResult = await emailService.sendRegistrationEmail({
      username: newUser.username,
      email: newUser.email,
      full_name: newUser.full_name
    });
    
    // Send admin notification
    const approvalLink = `${process.env.FRONTEND_URL}/admin/approve/${approvalToken}?user=${encodeURIComponent(newUser.username)}`;
    await emailService.sendAdminNotification(newUser, approvalLink);
    
    res.status(201).json({
      success: true,
      message: 'Registration submitted for admin approval. You will receive an email once approved.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        status: newUser.status
      },
      emailSent: emailResult.success
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  } finally {
    client.release();
  }
});

// Admin approval endpoint
router.get('/admin/approve/:token', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { token } = req.params;
    
    // Find user by approval token
    const userResult = await client.query(
      `SELECT id, username, email, full_name, status 
       FROM pipeline_dashboard.users 
       WHERE approval_token = $1 AND status = 'pending_approval'`,
      [token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired approval token' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Start transaction
    await client.query('BEGIN');
    
    // Update user status to active
    await client.query(
      `UPDATE pipeline_dashboard.users 
       SET status = 'active', 
           approval_token = NULL,
           approved_at = NOW(),
           approved_by = 'system'
       WHERE id = $1`,
      [user.id]
    );
    
    // Insert audit log
    await client.query(
      `INSERT INTO pipeline_dashboard.audit_logs 
       (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        'account_approved',
        JSON.stringify({ 
          approved_by: 'system', 
          approval_method: 'token_link' 
        }),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || 'unknown'
      ]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Send approval email to user
    await emailService.sendApprovalEmail({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: 'user'
    });
    
    // Get the username for the success page
    const username = req.query.user || user.username;
    
    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/approval-success?user=${encodeURIComponent(username)}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approval error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during approval' 
    });
  } finally {
    client.release();
  }
});

// Forgot password endpoint with email
router.post('/forgot-password', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Validate email domain
    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'power-transitions.com') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only @power-transitions.com email addresses are allowed' 
      });
    }
    
    // Check if user exists and is active
    const userResult = await client.query(
      `SELECT id, username, email FROM pipeline_dashboard.users 
       WHERE email = $1 AND status = 'active'`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.json({ 
        success: true, 
        message: 'If your email exists in our system, you will receive a reset link' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    // Store reset token
    await client.query(
      `UPDATE pipeline_dashboard.users 
       SET reset_token = $1, reset_token_expiry = $2
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, user.id]
    );
    
    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(user, resetToken);
    
    // Insert audit log
    await client.query(
      `INSERT INTO pipeline_dashboard.audit_logs 
       (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        'password_reset_requested',
        JSON.stringify({ email_sent: emailResult.success }),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent') || 'unknown'
      ]
    );
    
    res.json({
      success: true,
      message: 'Password reset email sent if the email exists in our system'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing reset request' 
    });
  } finally {
    client.release();
  }
});

// Get pending approvals (for admin panel)
router.get('/admin/pending-approvals', async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verify admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token and check admin role
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const userCheck = await client.query(
      `SELECT role FROM pipeline_dashboard.users WHERE id = $1 AND status = 'active'`,
      [decoded.userId]
    );
    
    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    // Get pending approvals
    const result = await client.query(
      `SELECT id, username, email, full_name, created_at 
       FROM pipeline_dashboard.users 
       WHERE status = 'pending_approval'
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      pendingUsers: result.rows
    });
    
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching pending approvals' 
    });
  } finally {
    client.release();
  }
});

module.exports = router;