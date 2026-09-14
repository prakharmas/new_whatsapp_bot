const express = require('express');
const router = express.Router();
const VendorController = require('../controllers/VendorController');
const { requireAuth, requireAdminApi } = require('../middleware/auth');
const { Vendor, AgentContext, Message, Chatroom, VendorWallet, PricingConfig, ExchangeRate, WalletTransaction, UsageRecord, Escalation, getAgentContext, saveAgentContext, generateVendorId, generateBusinessId, generateEscalationId } = require('../models/database');

// Dashboard routes
router.get('/', requireAuth, VendorController.dashboard);
router.get('/conversations', requireAuth, VendorController.conversations);
router.get('/chatroom/:id', requireAuth, VendorController.chatroom);

// Admin vendor selection API (requires admin/superadmin, no vendor selected needed)
router.get('/api/admin/vendors', requireAdminApi, async (req, res) => {
    try {
        const vendors = await Vendor.find({ is_active: true })
            .sort({ company_name: 1 })
            .select('vendor_id company_name email is_active')
            .lean();

        res.json({
            success: true,
            data: vendors.map(v => ({
                vendor_id: v.vendor_id,
                company_name: v.company_name,
                email: v.email
            }))
        });
    } catch (error) {
        console.error('[API] Error listing vendors for admin:', error);
        res.status(500).json({ success: false, error: 'Failed to list vendors' });
    }
});

// Set/unset the vendor the admin is currently viewing (persisted in session)
router.post('/api/admin/selected-vendor', requireAdminApi, async (req, res) => {
    try {
        const { vendorId } = req.body;

        if (vendorId) {
            const vendor = await Vendor.findOne({ vendor_id: vendorId, is_active: true });
            if (!vendor) {
                return res.status(404).json({ success: false, error: 'Vendor not found' });
            }
            req.session.selectedVendorId = vendorId;
            res.json({ success: true, data: { vendorId } });
        } else {
            delete req.session.selectedVendorId;
            res.json({ success: true, data: { vendorId: null } });
        }
    } catch (error) {
        console.error('[API] Error setting selected vendor:', error);
        res.status(500).json({ success: false, error: 'Failed to set selected vendor' });
    }
});

// ---------- Admin Client (vendor) management API ----------

// List clients (vendors) with stats
router.get('/api/admin/clients', requireAdminApi, async (req, res) => {
    try {
        const vendors = await Vendor.find({}).sort({ createdAt: -1 }).lean();

        const clients = await Promise.all(vendors.map(async (vendor) => {
            const chatroomCount = await Chatroom.countDocuments({ vendor_id: vendor.vendor_id });
            const messageCount = await Message.countDocuments({ vendor_id: vendor.vendor_id });
            const wallet = await VendorWallet.findOne({ vendor_id: vendor.vendor_id });

            return {
                vendor_id: vendor.vendor_id,
                company_name: vendor.company_name,
                email: vendor.email,
                phone: vendor.phone,
                is_active: vendor.is_active,
                createdAt: vendor.createdAt,
                chatroomCount,
                messageCount,
                walletBalanceUSD: wallet ? wallet.balance_usd_micro / 1000000 : 0
            };
        }));

        res.json({ success: true, data: clients });
    } catch (error) {
        console.error('[API] Error listing clients:', error);
        res.status(500).json({ success: false, error: 'Failed to list clients' });
    }
});

// Get a single client (vendor) detail
router.get('/api/admin/clients/:vendorId', requireAdminApi, async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ vendor_id: req.params.vendorId }).lean();
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        res.json({ success: true, data: vendor });
    } catch (error) {
        console.error('[API] Error fetching client:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch client' });
    }
});

// Create a client (vendor)
router.post('/api/admin/clients', requireAdminApi, async (req, res) => {
    try {
        const {
            company_name, email, phone, password,
            whatsapp_phone_id, whatsapp_access_token, webhook_verify_token, whatsapp_app_secret,
            is_active
        } = req.body;

        if (!company_name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Company name, email and password are required' });
        }

        const existing = await Vendor.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, error: 'A client with this email already exists' });
        }

        const vendorId = generateVendorId();
        const businessId = generateBusinessId();

        const vendor = new Vendor({
            vendor_id: vendorId,
            email: email.toLowerCase(),
            company_name,
            phone: phone || '',
            password,
            whatsapp_phone_id: whatsapp_phone_id || '',
            whatsapp_access_token: whatsapp_access_token || '',
            webhook_verify_token: webhook_verify_token || '',
            whatsapp_app_secret: whatsapp_app_secret || '',
            business_id: businessId,
            agent_id: 1,
            is_active: is_active !== false
        });

        await vendor.save();
        await saveAgentContext(vendorId, businessId, 1, `${company_name} Support Agent`, `You are ${company_name} WhatsApp assistant.`, 'admin');

        res.json({ success: true, data: { vendor_id: vendorId }, message: 'Client created successfully' });
    } catch (error) {
        console.error('[API] Error creating client:', error);
        res.status(500).json({ success: false, error: 'Failed to create client' });
    }
});

// Update a client (vendor)
router.put('/api/admin/clients/:vendorId', requireAdminApi, async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ vendor_id: req.params.vendorId });
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        const {
            company_name, email, phone, password,
            whatsapp_phone_id, whatsapp_access_token, webhook_verify_token, whatsapp_app_secret,
            is_active
        } = req.body;

        if (email && email.toLowerCase() !== vendor.email) {
            const existing = await Vendor.findOne({ email: email.toLowerCase() });
            if (existing) {
                return res.status(400).json({ success: false, error: 'A client with this email already exists' });
            }
        }

        if (company_name) vendor.company_name = company_name;
        if (email) vendor.email = email.toLowerCase();
        if (phone !== undefined) vendor.phone = phone;
        if (whatsapp_phone_id !== undefined) vendor.whatsapp_phone_id = whatsapp_phone_id;
        if (whatsapp_access_token !== undefined) vendor.whatsapp_access_token = whatsapp_access_token;
        if (webhook_verify_token !== undefined) vendor.webhook_verify_token = webhook_verify_token;
        if (whatsapp_app_secret !== undefined) vendor.whatsapp_app_secret = whatsapp_app_secret;
        if (is_active !== undefined) vendor.is_active = is_active;

        if (password && password.trim()) {
            vendor.password = password;
        }

        await vendor.save();

        res.json({ success: true, data: { vendor_id: vendor.vendor_id }, message: 'Client updated successfully' });
    } catch (error) {
        console.error('[API] Error updating client:', error);
        res.status(500).json({ success: false, error: 'Failed to update client' });
    }
});

// Toggle active status
router.post('/api/admin/clients/:vendorId/toggle', requireAdminApi, async (req, res) => {
    try {
        const vendor = await Vendor.findOne({ vendor_id: req.params.vendorId });
        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        vendor.is_active = !vendor.is_active;
        await vendor.save();
        res.json({ success: true, data: { vendor_id: vendor.vendor_id, is_active: vendor.is_active } });
    } catch (error) {
        console.error('[API] Error toggling client:', error);
        res.status(500).json({ success: false, error: 'Failed to update client status' });
    }
});

// JSON API routes for React frontend
router.get('/api/vendor/dashboard', requireAuth, (req, res, next) => {
    req.query.format = 'json';
    VendorController.dashboard(req, res, next);
});
router.get('/api/vendor/conversations', requireAuth, (req, res, next) => {
    req.query.format = 'json';
    VendorController.conversations(req, res, next);
});
router.get('/api/vendor/chatroom/:id', requireAuth, (req, res, next) => {
    req.query.format = 'json';
    VendorController.chatroom(req, res, next);
});

// AI Agent API routes
router.get('/api/vendor/agent', requireAuth, async (req, res) => {
    try {
        const agent = await getAgentContext(
            req.vendorId,
            req.vendor.business_id,
            req.vendor.agent_id
        );

        if (!agent) {
            return res.json({ success: true, data: null });
        }

        res.json({
            success: true,
            data: {
                _id: agent._id,
                name: agent.name,
                context: agent.context,
                is_active: agent.is_active,
                created_at: agent.createdAt,
                updated_at: agent.updatedAt
            }
        });
    } catch (error) {
        console.error('[API] Error fetching agent:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch agent' });
    }
});

router.put('/api/vendor/agent', requireAuth, async (req, res) => {
    try {
        const { name, context } = req.body;

        if (!name || !context) {
            return res.status(400).json({ success: false, error: 'Name and context are required' });
        }

        const updated = await saveAgentContext(
            req.vendorId,
            req.vendor.business_id,
            req.vendor.agent_id,
            name,
            context,
            'vendor'
        );

        res.json({
            success: true,
            data: {
                _id: updated._id,
                name: updated.name,
                context: updated.context,
                is_active: updated.is_active,
                created_at: updated.createdAt,
                updated_at: updated.updatedAt
            }
        });
    } catch (error) {
        console.error('[API] Error saving agent:', error);
        res.status(500).json({ success: false, error: 'Failed to save agent' });
    }
});

router.get('/api/vendor/agent/stats', requireAuth, async (req, res) => {
    try {
        const vendorId = req.vendorId;
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const botMessages = await Message.find({
            vendor_id: vendorId,
            message_type: 'bot',
            createdAt: { $gte: since },
            'resolution_analysis.analyzed_at': { $exists: true }
        });

        const totalBotResponses = botMessages.length;

        // Count per conversation (unique chatroom), not per message.
        const analyzedByChatroom = new Map();
        for (const m of botMessages) {
            const key = String(m.chatroom_id || '');
            const list = analyzedByChatroom.get(key);
            if (list) list.push(m);
            else analyzedByChatroom.set(key, [m]);
        }
        const analyzedConversations = analyzedByChatroom.size;

        let resolvedQueries = 0;
        let humanHandovers = 0;
        for (const msgs of analyzedByChatroom.values()) {
            if (msgs.some(m =>
                m.resolution_analysis?.resolved === true ||
                (m.resolution_analysis?.confidence >= 0.5 && m.resolution_analysis?.resolution_type === 'direct_answer')
            )) resolvedQueries++;
            if (msgs.some(m => m.resolution_analysis?.resolution_type === 'escalation_needed')) humanHandovers++;
        }
        const totalUserQueries = await Message.countDocuments({
            vendor_id: vendorId,
            message_type: 'user',
            createdAt: { $gte: since }
        });

        const unresolved = analyzedConversations - resolvedQueries - humanHandovers;

        const resolutionRate = analyzedConversations > 0
            ? Math.round((resolvedQueries / analyzedConversations) * 100)
            : 0;
        const handoverRate = analyzedConversations > 0
            ? Math.round((humanHandovers / analyzedConversations) * 100)
            : 0;
        const unresolvedRate = analyzedConversations > 0
            ? Math.round((Math.max(0, unresolved) / analyzedConversations) * 100)
            : 0;

        const avgConfidence = botMessages.length > 0
            ? Math.round((botMessages.reduce((sum, m) => sum + (m.resolution_analysis?.confidence || 0), 0) / botMessages.length) * 100)
            : 0;

        // Estimate avg response time from timestamps (bot reply time vs user message time)
        let avgResponseTime = 0;
        const recentConversations = await Message.aggregate([
            { $match: { vendor_id: vendorId, message_type: 'bot', createdAt: { $gte: since } } },
            { $sort: { createdAt: -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'messages',
                    let: { chatroomId: '$chatroom_id', botTime: '$createdAt' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$chatroom_id', '$$chatroomId'] },
                                        { $eq: ['$message_type', 'user'] },
                                        { $lt: ['$createdAt', '$$botTime'] }
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 }
                    ],
                    as: 'prevUserMsg'
                }
            },
            { $unwind: { path: '$prevUserMsg', preserveNullAndEmptyArrays: false } },
            {
                $project: {
                    responseTimeMs: { $subtract: ['$createdAt', '$prevUserMsg.createdAt'] }
                }
            }
        ]);

        if (recentConversations.length > 0) {
            const totalMs = recentConversations.reduce((sum, r) => sum + r.responseTimeMs, 0);
            avgResponseTime = Math.round(totalMs / recentConversations.length / 1000); // seconds
        }

        res.json({
            success: true,
            data: {
                resolution_rate: `${resolutionRate}%`,
                human_handover: `${handoverRate}%`,
                unresolved: `${unresolvedRate}%`,
                avg_response_time: `${avgResponseTime} sec`,
                raw: {
                    totalUserQueries,
                    totalBotResponses,
                    resolvedQueries,
                    humanHandovers,
                    avgConfidence
                }
            }
        });
    } catch (error) {
        console.error('[API] Error fetching agent stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch agent stats' });
    }
});

// ---------- Admin Pricing / Costing API ----------

// Get current pricing configuration
router.get('/api/admin/costing', requireAdminApi, async (req, res) => {
    try {
        let globalPricing = await PricingConfig.findOne({ vendor_id: 'GLOBAL' }).lean();
        if (!globalPricing) {
            globalPricing = new PricingConfig({ vendor_id: 'GLOBAL' });
            await globalPricing.save();
            globalPricing = globalPricing.toObject();
        }

        let defaultMarkup = await PricingConfig.findOne({ vendor_id: 'DEFAULT_MARKUP' }).lean();
        if (!defaultMarkup) {
            defaultMarkup = new PricingConfig({ vendor_id: 'DEFAULT_MARKUP' });
            await defaultMarkup.save();
            defaultMarkup = defaultMarkup.toObject();
        }

        let exchangeRate = await ExchangeRate.findOne({ from_currency: 'INR', to_currency: 'USD' }).lean();
        if (!exchangeRate) {
            exchangeRate = new ExchangeRate({ rate: 83.0 });
            await exchangeRate.save();
            exchangeRate = exchangeRate.toObject();
        }

        res.json({ success: true, data: { globalPricing, defaultMarkup, exchangeRate } });
    } catch (error) {
        console.error('[API] Error fetching costing config:', error);
        res.status(500).json({ success: false, error: 'Failed to load costing configuration' });
    }
});

// Update exchange rate
router.post('/api/admin/costing/exchange-rate', requireAdminApi, async (req, res) => {
    try {
        const { rate } = req.body;
        if (!rate || rate <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid exchange rate' });
        }
        await ExchangeRate.findOneAndUpdate(
            { from_currency: 'INR', to_currency: 'USD' },
            { rate, updated_at: new Date() },
            { upsert: true }
        );
        res.json({ success: true, message: 'Exchange rate updated successfully' });
    } catch (error) {
        console.error('[API] Error updating exchange rate:', error);
        res.status(500).json({ success: false, error: 'Failed to update exchange rate' });
    }
});

// Update global AI service pricing
router.post('/api/admin/costing/global', requireAdminApi, async (req, res) => {
    try {
        const { gpt4_mini_input_price, gpt4_mini_output_price, whisper_price_per_minute } = req.body;
        await PricingConfig.findOneAndUpdate(
            { vendor_id: 'GLOBAL' },
            { gpt4_mini_input_price, gpt4_mini_output_price, whisper_price_per_minute },
            { upsert: true }
        );
        res.json({ success: true, message: 'Global pricing updated successfully' });
    } catch (error) {
        console.error('[API] Error updating global pricing:', error);
        res.status(500).json({ success: false, error: 'Failed to update global pricing' });
    }
});

// Update default markup
router.post('/api/admin/costing/default-markup', requireAdminApi, async (req, res) => {
    try {
        const { new_user_4h_markup, existing_user_20h_markup, existing_user_24h_markup } = req.body;
        await PricingConfig.findOneAndUpdate(
            { vendor_id: 'DEFAULT_MARKUP' },
            { new_user_4h_markup, existing_user_20h_markup, existing_user_24h_markup },
            { upsert: true }
        );
        res.json({ success: true, message: 'Default markup updated successfully' });
    } catch (error) {
        console.error('[API] Error updating default markup:', error);
        res.status(500).json({ success: false, error: 'Failed to update default markup' });
    }
});

// ---------- Admin Finance API (Wallet / Top-up / Billing) ----------

// Get all client wallets with balances
router.get('/api/admin/wallet', requireAdminApi, async (req, res) => {
    try {
        const vendors = await Vendor.find({}).sort({ createdAt: -1 }).lean();
        const walletMap = {};
        const wallets = await VendorWallet.find({ vendor_id: { $in: vendors.map(v => v.vendor_id) } }).lean();
        wallets.forEach(w => walletMap[w.vendor_id] = w);

        let exchangeRate = await ExchangeRate.findOne({ from_currency: 'INR', to_currency: 'USD' });
        if (!exchangeRate) {
            exchangeRate = new ExchangeRate({ rate: 83.0 });
            await exchangeRate.save();
        }

        const data = vendors.map(vendor => ({
            vendor_id: vendor.vendor_id,
            company_name: vendor.company_name,
            balance_usd_micro: walletMap[vendor.vendor_id]?.balance_usd_micro || 0
        }));

        res.json({ success: true, data, exchangeRate: exchangeRate.rate });
    } catch (error) {
        console.error('[API] Error loading wallet management:', error);
        res.status(500).json({ success: false, error: 'Failed to load wallet management' });
    }
});

// Perform a wallet top-up
router.post('/api/admin/wallet/topup', requireAdminApi, async (req, res) => {
    try {
        const { vendor_id, amount_inr, description } = req.body;
        if (!vendor_id || !amount_inr || amount_inr <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }

        const exchangeRate = await ExchangeRate.findOne({ from_currency: 'INR', to_currency: 'USD' });
        if (!exchangeRate) {
            return res.status(400).json({ success: false, error: 'Exchange rate not configured' });
        }

        const amountUSD = amount_inr / exchangeRate.rate;
        const amountMicro = Math.round(amountUSD * 1000000);

        await VendorWallet.findOneAndUpdate(
            { vendor_id },
            { $inc: { balance_usd_micro: amountMicro }, last_updated: new Date() },
            { upsert: true }
        );

        await new WalletTransaction({
            vendor_id,
            transaction_type: 'credit',
            amount_inr,
            amount_usd_micro: amountMicro,
            exchange_rate: exchangeRate.rate,
            description: description || 'Admin top-up',
            added_by: req.admin?.email || 'admin'
        }).save();

        res.json({ success: true, message: `Added ₹${amount_inr} to client wallet` });
    } catch (error) {
        console.error('[API] Error processing top-up:', error);
        res.status(500).json({ success: false, error: 'Failed to process top-up' });
    }
});

// Get top-up history
router.get('/api/admin/topup-history', requireAdminApi, async (req, res) => {
    try {
        const topups = await WalletTransaction.find({ transaction_type: 'credit' })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const vendorIds = [...new Set(topups.map(t => t.vendor_id))];
        const vendors = await Vendor.find({ vendor_id: { $in: vendorIds } }).lean();
        const vendorMap = {};
        vendors.forEach(v => vendorMap[v.vendor_id] = v);

        const data = topups.map(topup => ({
            _id: topup._id,
            createdAt: topup.createdAt,
            vendor_id: topup.vendor_id,
            vendor_name: vendorMap[topup.vendor_id]?.company_name || 'Unknown',
            amount_inr: topup.amount_inr,
            amount_usd_micro: topup.amount_usd_micro,
            exchange_rate: topup.exchange_rate,
            added_by: topup.added_by,
            description: topup.description || 'Admin top-up'
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('[API] Error loading topup history:', error);
        res.status(500).json({ success: false, error: 'Failed to load top-up history' });
    }
});

// Get billing history
router.get('/api/admin/billing-history', requireAdminApi, async (req, res) => {
    try {
        const billings = await UsageRecord.find({})
            .sort({ charged_at: -1 })
            .limit(100)
            .lean();

        const vendorIds = [...new Set(billings.map(b => b.vendor_id))];
        const vendors = await Vendor.find({ vendor_id: { $in: vendorIds } }).lean();
        const vendorMap = {};
        vendors.forEach(v => vendorMap[v.vendor_id] = v);

        const data = billings.map(billing => ({
            _id: billing._id,
            charged_at: billing.charged_at,
            vendor_id: billing.vendor_id,
            vendor_name: vendorMap[billing.vendor_id]?.company_name || 'Unknown',
            phone_number: billing.phone_number,
            services_used: billing.services_used || [],
            base_cost_usd_micro: billing.base_cost_usd_micro || 0,
            final_cost_usd_micro: billing.final_cost_usd_micro || 0
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error('[API] Error loading billing history:', error);
        res.status(500).json({ success: false, error: 'Failed to load billing history' });
    }
});

// ---------- Escalation API ----------

// List escalations with stats for the current vendor
router.get('/api/vendor/escalations', requireAuth, async (req, res) => {
    try {
        const vendorId = req.vendorId;

        const escalations = await Escalation.find({ vendor_id: vendorId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const openCount = await Escalation.countDocuments({ vendor_id: vendorId, status: 'Open' });
        const inProgressCount = await Escalation.countDocuments({ vendor_id: vendorId, status: 'In Progress' });
        const resolvedCount = await Escalation.countDocuments({ vendor_id: vendorId, status: 'Resolved' });

        const data = escalations.map(e => ({
            _id: e._id,
            escalation_id: e.escalation_id,
            subject: e.subject,
            category: e.category,
            priority: e.priority,
            status: e.status,
            created_at: e.createdAt,
            updated_at: e.updatedAt,
            messages_count: e.messages?.length || 0
        }));

        res.json({
            success: true,
            data: {
                escalations: data,
                stats: {
                    open: openCount,
                    inProgress: inProgressCount,
                    resolved: resolvedCount
                }
            }
        });
    } catch (error) {
        console.error('[API] Error listing escalations:', error);
        res.status(500).json({ success: false, error: 'Failed to load escalations' });
    }
});

// Get a single escalation detail
router.get('/api/vendor/escalations/:id', requireAuth, async (req, res) => {
    try {
        const escalation = await Escalation.findOne({
            _id: req.params.id,
            vendor_id: req.vendorId
        }).lean();

        if (!escalation) {
            return res.status(404).json({ success: false, error: 'Escalation not found' });
        }

        res.json({ success: true, data: escalation });
    } catch (error) {
        console.error('[API] Error fetching escalation:', error);
        res.status(500).json({ success: false, error: 'Failed to load escalation' });
    }
});

// Create a new escalation
router.post('/api/vendor/escalations', requireAuth, async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ success: false, error: 'Subject and description are required' });
        }

        const escalation = new Escalation({
            escalation_id: generateEscalationId(),
            vendor_id: req.vendorId,
            subject,
            description,
            category: category || 'General',
            priority: ['High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
            status: 'Open'
        });

        await escalation.save();

        res.json({ success: true, data: escalation._id, message: 'Escalation raised successfully' });
    } catch (error) {
        console.error('[API] Error creating escalation:', error);
        res.status(500).json({ success: false, error: 'Failed to raise escalation' });
    }
});

// Add a message to an escalation
router.post('/api/vendor/escalations/:id/messages', requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, error: 'Message text is required' });
        }

        const escalation = await Escalation.findOne({
            _id: req.params.id,
            vendor_id: req.vendorId
        });

        if (!escalation) {
            return res.status(404).json({ success: false, error: 'Escalation not found' });
        }

        escalation.messages.push({
            sender: 'vendor',
            sender_name: req.vendor?.company_name || 'Vendor',
            text: text.trim()
        });

        await escalation.save();

        const added = escalation.messages[escalation.messages.length - 1];
        res.json({ success: true, data: added, message: 'Message sent' });
    } catch (error) {
        console.error('[API] Error adding escalation message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// Update escalation status
router.patch('/api/vendor/escalations/:id/status', requireAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const escalation = await Escalation.findOne({
            _id: req.params.id,
            vendor_id: req.vendorId
        });

        if (!escalation) {
            return res.status(404).json({ success: false, error: 'Escalation not found' });
        }

        escalation.status = status;
        await escalation.save();

        res.json({ success: true, data: { status }, message: 'Status updated' });
    } catch (error) {
        console.error('[API] Error updating escalation status:', error);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

module.exports = router;