const jwt = require('jsonwebtoken');
const { Vendor } = require('../models/database');
const AdminUser = require('../models/AdminModel');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (vendorId) => {
    return jwt.sign({ vendorId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Admin token helpers (separate namespace in payload)
const generateAdminToken = (adminId) => {
    return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '7d' });
};

const verifyAdminToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware (supports vendor AND admin users)
const requireAuth = async (req, res, next) => {
    try {
        const token = req.session.token || req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.redirect('/login');
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (e) {
            req.session.destroy();
            return res.redirect('/login');
        }

        // ---------- ADMIN path ----------
        // If the token is an admin token (has adminId), the user is an admin/superadmin
        // able to view any vendor's data by selecting a vendor.
        if (decoded.adminId) {
            const AdminUser = require('../models/AdminModel');
            const admin = await AdminUser.findById(decoded.adminId);
            if (!admin || !admin.is_active) {
                req.session.destroy();
                return res.redirect('/login');
            }

            req.isAdmin = true;
            req.role = admin.role;
            req.admin = admin;

            // Determine which vendor the admin is viewing.
            const selectedVendorId =
                req.query.vendorId ||
                req.session.selectedVendorId ||
                req.headers['x-selected-vendor'];

            if (selectedVendorId) {
                const vendor = await Vendor.findOne({ vendor_id: selectedVendorId, is_active: true });
                if (vendor) {
                    req.vendor = vendor;
                    req.vendorId = vendor.vendor_id;
                    return next();
                }
            }

            // If no vendor selected, respond accordingly for API requests,
            // otherwise let admin land on their own dashboard.
            if (req.query.format === 'json' || req.xhr || req.headers.accept?.includes('application/json')) {
                return res.status(400).json({
                    success: false,
                    error: 'No vendor selected. Please select a vendor to view data.'
                });
            }
            return res.redirect('/admin');
        }

        // ---------- VENDOR path ----------
        const vendor = await Vendor.findOne({ vendor_id: decoded.vendorId, is_active: true });
        
        if (!vendor) {
            req.session.destroy();
            return res.redirect('/login');
        }

        req.vendor = vendor;
        req.vendorId = vendor.vendor_id;
        req.role = 'vendor';
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        req.session.destroy();
        return res.redirect('/login');
    }
};

// Authenticate admin session (checks adminToken in session or Authorization header)
const requireAdmin = async (req, res, next) => {
    try {
        // First try AdminUser session/token
        const adminToken = req.session?.adminToken || req.headers['admin-authorization']?.replace('Bearer ', '');
        if (adminToken) {
            try {
                const decoded = verifyAdminToken(adminToken);
                const admin = await AdminUser.findById(decoded.adminId);
                if (admin && admin.is_active) {
                    req.admin = admin;
                    req.isSystemAdmin = true;
                    return next();
                }
            } catch (e) {
                // continue to vendor-based check
            }
        }

        // Check vendor token directly (avoid calling requireAuth which redirects to /login)
        const vendorToken = req.session?.token || req.headers.authorization?.replace('Bearer ', '');
        if (vendorToken) {
            try {
                const decoded = verifyToken(vendorToken);
                const vendor = await Vendor.findOne({ vendor_id: decoded.vendorId, is_active: true });
                if (vendor && vendor.is_system_admin) {
                    req.vendor = vendor;
                    req.vendorId = vendor.vendor_id;
                    req.isSystemAdmin = true;
                    return next();
                }
            } catch (e) {
                // ignore and fall through to redirect
            }
        }

        // Not authenticated as admin or vendor-admin -> redirect to admin login
        return res.redirect('/admin/login');
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.redirect('/admin/login');
    }
};

// JSON API admin authentication (for vendor selection / management APIs).
// Verifies an AdminUser token without requiring a vendor to be selected.
const requireAdminApi = async (req, res, next) => {
    try {
        const token = req.session.adminToken || req.session.token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const decoded = verifyToken(token);
        if (!decoded.adminId) {
            return res.status(401).json({ success: false, error: 'Admin access required' });
        }

        const AdminUser = require('../models/AdminModel');
        const admin = await AdminUser.findById(decoded.adminId);
        if (!admin || !admin.is_active) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        req.isAdmin = true;
        req.role = admin.role;
        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// Check if already authenticated (for vendor login/register pages)
const redirectIfAuthenticated = async (req, res, next) => {
    try {
        const token = req.session.token;
        if (token) {
            const decoded = verifyToken(token);
            const vendor = await Vendor.findOne({ vendor_id: decoded.vendorId, is_active: true });
            if (vendor) {
                return res.redirect('/');
            }
        }
    } catch (error) {
        // Token invalid, continue to login/register
    }
    next();
};

// Redirect if admin session exists (for admin login page)
const redirectIfAdminAuthenticated = async (req, res, next) => {
    try {
        const adminToken = req.session.adminToken;
        if (adminToken) {
            const decoded = verifyAdminToken(adminToken);
            const admin = await AdminUser.findById(decoded.adminId);
            if (admin && admin.is_active) {
                return res.redirect('/admin');
            }
        }
    } catch (error) {
        // ignore and continue
    }
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    generateAdminToken,
    verifyAdminToken,
    requireAuth,
    requireAdmin,
    requireAdminApi,
    redirectIfAuthenticated,
    redirectIfAdminAuthenticated
};