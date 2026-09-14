const { Vendor } = require('../models/database');
const { generateToken, generateAdminToken } = require('../middleware/auth');

class AuthController {
    showLogin(req, res) {
        res.render('login', { error: null });
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const vendor = await Vendor.findOne({ email: email.toLowerCase(), is_active: true });
            if (!vendor || !(await vendor.comparePassword(password))) {
                return res.render('login', { error: 'Invalid email or password' });
            }

            const token = generateToken(vendor.vendor_id);
            req.session.token = token;

            res.redirect('/');
        } catch (error) {
            console.error('Login error:', error);
            res.render('login', { error: 'Login failed. Please try again.' });
        }
    }

    // JSON API login for React frontend (supports both vendor and admin users)
    async apiLogin(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required' });
            }

            // 1. Try admin login first (admins can also access vendor pages via vendor selection)
            const AdminUser = require('../models/AdminModel');
            const admin = await AdminUser.findOne({ email: email.toLowerCase(), is_active: true });
            if (admin) {
                if (!(await admin.comparePassword(password))) {
                    return res.status(401).json({ success: false, error: 'Invalid email or password' });
                }
                const token = generateAdminToken(admin._id);
                req.session.adminToken = token;
                req.session.token = token;
                return res.json({
                    success: true,
                    data: {
                        token,
                        role: admin.role, // 'admin' or 'superadmin'
                        name: admin.name,
                        email: admin.email,
                        isAdmin: true
                    }
                });
            }

            // 2. Fall back to vendor login
            const vendor = await Vendor.findOne({ email: email.toLowerCase(), is_active: true });
            if (!vendor || !(await vendor.comparePassword(password))) {
                return res.status(401).json({ success: false, error: 'Invalid email or password' });
            }

            const token = generateToken(vendor.vendor_id);
            req.session.token = token;

            res.json({
                success: true,
                data: {
                    token,
                    role: 'vendor',
                    vendor: {
                        vendor_id: vendor.vendor_id,
                        company_name: vendor.company_name,
                        email: vendor.email
                    }
                }
            });
        } catch (error) {
            console.error('API Login error:', error);
            res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
        }
    }

    logout(req, res) {
        req.session.destroy();
        res.redirect('/login');
    }

    // JSON API logout for React frontend
    apiLogout(req, res) {
        req.session.destroy();
        res.json({ success: true });
    }

    showAdminLogin(req, res) {
        res.render('admin/login', { error: null });
    }

    async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            const AdminUser = require('../models/AdminModel');
            const admin = await AdminUser.findOne({ email: email.toLowerCase(), is_active: true });
            if (!admin || !(await admin.comparePassword(password))) {
                return res.render('admin/login', { error: 'Invalid email or password' });
            }

            const token = generateAdminToken(admin._id);
            req.session.adminToken = token;
            return res.redirect('/admin');
        } catch (error) {
            console.error('Admin login error:', error);
            res.render('admin/login', { error: 'Login failed. Please try again.' });
        }
    }

    adminLogout(req, res) {
        delete req.session.adminToken;
        res.redirect('/admin/login');
    }
}

module.exports = new AuthController();