const { Chatroom, Message } = require('../models/database');

class VendorController {
    async dashboard(req, res) {
        try {
            console.log(`[DASHBOARD] Loading for vendor: ${req.vendorId}`);

            // Time range filter (days). Default: 30 days.
            const days = parseInt(req.query.days) || 30;
            let since;
            if (days === 1) {
                // "Today" means the current calendar day (from 00:00), not a rolling 24h window.
                since = new Date();
                since.setHours(0, 0, 0, 0);
            } else {
                since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            }

            const chatroomsQuery = { vendor_id: req.vendorId, updatedAt: { $gte: since } };
            const messagesQuery = { vendor_id: req.vendorId, createdAt: { $gte: since } };

            const chatrooms = await Chatroom.find(chatroomsQuery).sort({ updatedAt: -1 });
            console.log(`[DASHBOARD] Found ${chatrooms.length} chatrooms (last ${days} days)`);

            // Calculate AI Resolution Rate
            let totalUserQueries = 0;
            let resolvedQueries = 0;
            let totalBotResponses = 0;

            // Get analytics data for dashboard
            const messages = await Message.find(messagesQuery);
            const analyzedMessages = messages.filter(m => m.intent || m.sentiment);

            // Calculate resolution metrics
            const botMessages = await Message.find({
                vendor_id: req.vendorId,
                message_type: 'bot',
                createdAt: { $gte: since },
                'resolution_analysis.analyzed_at': { $exists: true }
            });

            totalBotResponses = botMessages.length;

            // Group analyzed bot replies by chatroom so stats are counted per conversation,
            // not per message (one conversation with many replies counts once).
            const analyzedByChatroom = new Map();
            for (const m of botMessages) {
                const key = String(m.chatroom_id || '');
                const list = analyzedByChatroom.get(key);
                if (list) list.push(m);
                else analyzedByChatroom.set(key, [m]);
            }
            const analyzedConversations = analyzedByChatroom.size;

            let humanHandoverCount = 0;
            for (const msgs of analyzedByChatroom.values()) {
                // Count both high-confidence resolved AND medium-confidence helpful responses
                if (msgs.some(m =>
                    m.resolution_analysis?.resolved === true ||
                    (m.resolution_analysis?.confidence >= 0.5 && m.resolution_analysis?.resolution_type === 'direct_answer')
                )) resolvedQueries++;
                if (msgs.some(m => m.resolution_analysis?.resolution_type === 'escalation_needed')) humanHandoverCount++;
            }
            totalUserQueries = await Message.countDocuments({
                vendor_id: req.vendorId,
                message_type: 'user',
                createdAt: { $gte: since }
            });

            // Calculate average first-response time (minutes) for the period
            const messagesByChatroom = {};
            for (const m of messages) {
                const key = String(m.chatroom_id || '');
                if (!messagesByChatroom[key]) messagesByChatroom[key] = [];
                messagesByChatroom[key].push(m);
            }
            let totalResponseMinutes = 0;
            let respondedChatrooms = 0;
            for (const roomMessages of Object.values(messagesByChatroom)) {
                roomMessages.sort((a, b) => a.createdAt - b.createdAt);
                const firstUser = roomMessages.find(m => m.message_type === 'user');
                const firstBot = firstUser && roomMessages.find(m => m.message_type === 'bot' && m.createdAt > firstUser.createdAt);
                if (!firstUser || !firstBot) continue;
                totalResponseMinutes += (new Date(firstBot.createdAt) - new Date(firstUser.createdAt)) / 60000;
                respondedChatrooms++;
            }
            const avgResponseTime = respondedChatrooms > 0 ? Math.round(totalResponseMinutes / respondedChatrooms) : 0;

            // Build per-day trend data for the Support Performance chart
            const spanDays = Math.min(days, 30);
            const trend = [];
            for (let i = spanDays - 1; i >= 0; i--) {
                const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
                const dayMsgs = messages.filter(m => m.message_type === 'bot' && m.createdAt >= dayStart && m.createdAt < dayEnd);
                const dayUserMsgs = messages.filter(m => m.message_type === 'user' && m.createdAt >= dayStart && m.createdAt < dayEnd);
                const dayResolvedChatrooms = new Set();
                const dayHandoverChatrooms = new Set();
                for (const m of dayMsgs) {
                    const key = String(m.chatroom_id || '');
                    if (m.resolution_analysis?.resolved === true) dayResolvedChatrooms.add(key);
                    if (m.resolution_analysis?.resolution_type === 'escalation_needed') dayHandoverChatrooms.add(key);
                }
                trend.push({
                    day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
                    total: dayUserMsgs.length,
                    aiResolved: dayResolvedChatrooms.size,
                    humanHandover: dayHandoverChatrooms.size
                });
            }

            const analytics = {
                totalAnalyzed: analyzedMessages.length,
                sentiments: {
                    positive: analyzedMessages.filter(m => m.sentiment === 'positive').length,
                    neutral: analyzedMessages.filter(m => m.sentiment === 'neutral').length,
                    negative: analyzedMessages.filter(m => m.sentiment === 'negative').length
                },
                intents: {
                    query: analyzedMessages.filter(m => m.intent === 'query').length,
                    complaint: analyzedMessages.filter(m => m.intent === 'complaint').length,
                    need_action: analyzedMessages.filter(m => m.intent === 'need_action').length,
                    feedback: analyzedMessages.filter(m => m.intent === 'feedback').length
                },
                resolution: {
                    totalQueries: totalUserQueries,
                    analyzedResponses: analyzedConversations,
                    resolvedQueries: resolvedQueries,
                    humanHandoverCount: humanHandoverCount,
                    resolutionRate: analyzedConversations > 0 ? Math.round((resolvedQueries / analyzedConversations) * 100) : 0,
                    avgConfidence: botMessages.length > 0 ? 
                        Math.round((botMessages.reduce((sum, m) => sum + (m.resolution_analysis?.confidence || 0), 0) / botMessages.length) * 100) : 0,
                    avgResponseTime
                }
            };

            // Get AI insights for each chatroom
            const { calculateConversationSentiment } = require('../utils/analytics');
            const { getEffectiveSLAStatus } = require('../services/SLAService');
            const chatroomsWithInsights = await Promise.all(chatrooms.map(async (chatroom) => {
                const messages = await Message.find({
                    vendor_id: req.vendorId,
                    chatroom_id: chatroom._id
                }).sort({ createdAt: -1 }).limit(10);

                const userMessages = messages.filter(m => m.message_type === 'user' && m.intent && m.sentiment);
                const latestIntent = userMessages.length > 0 ? userMessages[0].intent : null;
                const latestSentiment = userMessages.length > 0 ? userMessages[0].sentiment : null;

                const sentimentCounts = {
                    positive: userMessages.filter(m => m.sentiment === 'positive').length,
                    neutral: userMessages.filter(m => m.sentiment === 'neutral').length,
                    negative: userMessages.filter(m => m.sentiment === 'negative').length
                };

                const conversationSentiment = calculateConversationSentiment(sentimentCounts);

                // 🎯 Use unified SLA status
                const firstUserMessage = await Message.findOne({
                    chatroom_id: chatroom._id,
                    message_type: 'user'
                }).sort({ createdAt: 1 });
                
                const slaInfo = getEffectiveSLAStatus(chatroom, firstUserMessage);

                return {
                    ...chatroom.toObject(),
                    latestIntent,
                    latestSentiment,
                    sentimentCounts,
                    conversationSentiment,
                    totalMessages: messages.length,
                    aiAnalyzedMessages: userMessages.length,
                    slaInfo
                };
            }));

            console.log(`[DASHBOARD] Rendering with ${chatroomsWithInsights.length} chatrooms`);

            // Return JSON for API requests
            if (req.query.format === 'json' || req.xhr) {
                return res.json({
                    success: true,
                    data: {
                    chatrooms: chatroomsWithInsights,
                    analytics,
                    trend,
                    days,
                    vendor: {
                            vendor_id: req.vendor.vendor_id,
                            company_name: req.vendor.company_name,
                            email: req.vendor.email
                        }
                    }
                });
            }

            res.render('chatrooms', {
                chatrooms: chatroomsWithInsights,
                analytics,
                currentPage: 'dashboard',
                vendor: req.vendor
            });
        } catch (error) {
            console.error('[DASHBOARD] Error:', error);
            res.status(500).send('Error loading chatrooms: ' + error.message);
        }
    }

    async conversations(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const skip = (page - 1) * limit;
            
            const totalChatrooms = await Chatroom.countDocuments({ vendor_id: req.vendorId });
            const totalPages = Math.ceil(totalChatrooms / limit);
            
            const chatrooms = await Chatroom.find({ vendor_id: req.vendorId })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit);

            const { calculateConversationSentiment } = require('../utils/analytics');
            const { getEffectiveSLAStatus } = require('../services/SLAService');
            const chatroomsWithInsights = await Promise.all(chatrooms.map(async (chatroom) => {
                const messages = await Message.find({
                    vendor_id: req.vendorId,
                    chatroom_id: chatroom._id
                }).sort({ createdAt: -1 }).limit(10);

                const userMessages = messages.filter(m => m.message_type === 'user' && m.intent && m.sentiment);
                const latestIntent = userMessages.length > 0 ? userMessages[0].intent : null;
                const latestSentiment = userMessages.length > 0 ? userMessages[0].sentiment : null;

                const sentimentCounts = {
                    positive: userMessages.filter(m => m.sentiment === 'positive').length,
                    neutral: userMessages.filter(m => m.sentiment === 'neutral').length,
                    negative: userMessages.filter(m => m.sentiment === 'negative').length
                };

                const conversationSentiment = calculateConversationSentiment(sentimentCounts);

                const firstUserMessage = await Message.findOne({
                    chatroom_id: chatroom._id,
                    message_type: 'user'
                }).sort({ createdAt: 1 });

                const slaInfo = getEffectiveSLAStatus(chatroom, firstUserMessage);

                return {
                    ...chatroom.toObject(),
                    latestIntent,
                    latestSentiment,
                    sentimentCounts,
                    conversationSentiment,
                    totalMessages: messages.length,
                    aiAnalyzedMessages: userMessages.length,
                    slaInfo
                };
            }));

            if (req.query.format === 'json' || req.xhr) {
                return res.json({
                    success: true,
                    data: {
                        chatrooms: chatroomsWithInsights,
                        pagination: {
                            page,
                            totalItems: totalChatrooms,
                            hasNext: page < totalPages
                        },
                        vendor: {
                            vendor_id: req.vendor.vendor_id,
                            company_name: req.vendor.company_name,
                            email: req.vendor.email
                        }
                    }
                });
            }

            res.render('conversations', {
                chatrooms: chatroomsWithInsights,
                currentPage: 'conversations',
                vendor: req.vendor,
                pagination: {
                    page,
                    totalPages,
                    totalItems: totalChatrooms,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            res.status(500).send('Error loading conversations');
        }
    }

    async chatroom(req, res) {
        try {
            const chatroom = await Chatroom.findOne({
                _id: req.params.id,
                vendor_id: req.vendorId
            });

            if (!chatroom) {
                return res.status(404).send('Chatroom not found');
            }

            const messages = await Message.find({
                vendor_id: req.vendorId,
                chatroom_id: req.params.id
            }).sort({ createdAt: 1 });

            const userMessages = messages.filter(m => m.message_type === 'user');
            const aiAnalyzedMessages = userMessages.filter(m => m.intent || m.sentiment);

            const firstUserMessage = await Message.findOne({
                chatroom_id: req.params.id,
                message_type: 'user'
            }).sort({ createdAt: 1 });

            const { calculateConversationSentiment } = require('../utils/analytics');
            const { getEffectiveSLAStatus } = require('../services/SLAService');
            const slaInfo = getEffectiveSLAStatus(chatroom, firstUserMessage);

            const insights = {
                totalMessages: messages.length,
                userMessages: userMessages.length,
                aiAnalyzedMessages: aiAnalyzedMessages.length,
                intents: {
                    query: aiAnalyzedMessages.filter(m => m.intent === 'query').length,
                    complaint: aiAnalyzedMessages.filter(m => m.intent === 'complaint').length,
                    need_action: aiAnalyzedMessages.filter(m => m.intent === 'need_action').length,
                    feedback: aiAnalyzedMessages.filter(m => m.intent === 'feedback').length
                },
                sentiments: {
                    positive: aiAnalyzedMessages.filter(m => m.sentiment === 'positive').length,
                    neutral: aiAnalyzedMessages.filter(m => m.sentiment === 'neutral').length,
                    negative: aiAnalyzedMessages.filter(m => m.sentiment === 'negative').length
                },
                conversationSentiment: calculateConversationSentiment({
                    positive: aiAnalyzedMessages.filter(m => m.sentiment === 'positive').length,
                    neutral: aiAnalyzedMessages.filter(m => m.sentiment === 'neutral').length,
                    negative: aiAnalyzedMessages.filter(m => m.sentiment === 'negative').length
                }),
                slaInfo
            };

            if (req.query.format === 'json' || req.xhr) {
                return res.json({
                    success: true,
                    data: {
                        chatroom,
                        messages: messages.map(m => m.toObject()),
                        insights
                    }
                });
            }

            res.render('chatroom', { 
                chatroom, 
                messages, 
                insights, 
                vendor: req.vendor 
            });
        } catch (error) {
            res.status(500).send('Error loading chatroom');
        }
    }
}

module.exports = new VendorController();