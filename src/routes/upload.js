const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const UploadController = require('../controllers/UploadController');
const { UploadBatch, ContactUpload } = require('../models/database');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only CSV and Excel files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// EJS routes (keeping existing structure)
router.get('/upload', requireAuth, UploadController.showUpload);
router.post('/upload', requireAuth, upload.single('file'), UploadController.processUpload);
router.get('/upload/batch/:batchId', requireAuth, UploadController.viewBatch);
router.post('/upload/batch/:batchId/delete', requireAuth, UploadController.deleteBatch);

// JSON API routes for React frontend
router.get('/api/vendor/uploads', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const skip = (page - 1) * limit;

        const totalBatches = await UploadBatch.countDocuments({ vendor_id: req.vendorId });
        const totalPages = Math.ceil(totalBatches / limit);

        const batches = await UploadBatch.find({ vendor_id: req.vendorId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: {
                batches: batches.map(b => ({
                    _id: b._id,
                    original_name: b.original_name,
                    file_type: b.file_type,
                    total_rows: b.total_rows,
                    success_rows: b.success_rows,
                    error_rows: b.error_rows,
                    status: b.status,
                    columns: b.columns,
                    created_at: b.createdAt
                })),
                pagination: {
                    page,
                    totalPages,
                    totalItems: totalBatches,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('[API] Error listing uploads:', error);
        res.status(500).json({ success: false, error: 'Failed to load uploads' });
    }
});

router.post('/api/vendor/uploads', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const XLSX = require('xlsx');
        const fs = require('fs');
        const file = req.file;
        const ext = path.extname(file.originalname).toLowerCase();
        const fileType = ext === '.csv' ? 'csv' : (ext === '.xls' ? 'xls' : 'xlsx');

        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ success: false, error: 'File is empty or has no data rows' });
        }

        const columns = Object.keys(rows[0]);

        const batch = new UploadBatch({
            vendor_id: req.vendorId,
            filename: file.filename,
            original_name: file.originalname,
            file_type: fileType,
            columns,
            total_rows: rows.length,
            status: 'processing'
        });
        await batch.save();

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            const validationErrors = [];

            const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
            if (!hasData) {
                validationErrors.push('Row is empty');
            }

            const contact = new ContactUpload({
                vendor_id: req.vendorId,
                batch_id: batch._id,
                row_number: rowNum,
                fields: row,
                status: validationErrors.length > 0 ? 'invalid' : 'valid',
                validation_errors: validationErrors
            });

            try {
                await contact.save();
                if (validationErrors.length > 0) {
                    errorCount++;
                    errors.push({ row: rowNum, message: validationErrors.join('; ') });
                } else {
                    successCount++;
                }
            } catch (saveError) {
                errorCount++;
                errors.push({ row: rowNum, message: saveError.message });
            }
        }

        batch.success_rows = successCount;
        batch.error_rows = errorCount;
        batch.errors = errors.slice(0, 50);
        batch.status = errorCount === rows.length ? 'failed' : 'completed';
        await batch.save();

        fs.unlinkSync(file.path);

        res.json({
            success: true,
            data: {
                _id: batch._id,
                original_name: batch.original_name,
                file_type: batch.file_type,
                total_rows: batch.total_rows,
                success_rows: batch.success_rows,
                error_rows: batch.error_rows,
                status: batch.status,
                created_at: batch.createdAt
            },
            message: `Uploaded ${successCount} contacts successfully` + (errorCount > 0 ? `. ${errorCount} rows had errors.` : '')
        });
    } catch (error) {
        console.error('[API] Error processing upload:', error);
        if (req.file && require('fs').existsSync(req.file.path)) {
            require('fs').unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, error: error.message || 'Failed to process upload' });
    }
});

router.delete('/api/vendor/uploads/:batchId', requireAuth, async (req, res) => {
    try {
        const batch = await UploadBatch.findOneAndDelete({
            _id: req.params.batchId,
            vendor_id: req.vendorId
        });

        if (!batch) {
            return res.status(404).json({ success: false, error: 'Upload batch not found' });
        }

        await ContactUpload.deleteMany({ batch_id: batch._id });

        res.json({ success: true, message: 'Upload batch deleted successfully' });
    } catch (error) {
        console.error('[API] Error deleting batch:', error);
        res.status(500).json({ success: false, error: 'Failed to delete batch' });
    }
});

// View saved records for a batch
router.get('/api/vendor/uploads/:batchId/records', requireAuth, async (req, res) => {
    try {
        const batch = await UploadBatch.findOne({
            _id: req.params.batchId,
            vendor_id: req.vendorId
        });

        if (!batch) {
            return res.status(404).json({ success: false, error: 'Upload batch not found' });
        }

        const records = await ContactUpload.find({ batch_id: batch._id })
            .sort({ row_number: 1 })
            .limit(500)
            .lean();

        res.json({
            success: true,
            data: {
                batch: {
                    _id: batch._id,
                    original_name: batch.original_name,
                    columns: batch.columns
                },
                records: records.map(r => ({
                    _id: r._id,
                    row_number: r.row_number,
                    fields: r.fields,
                    status: r.status,
                    validation_errors: r.validation_errors || []
                }))
            }
        });
    } catch (error) {
        console.error('[API] Error fetching batch records:', error);
        res.status(500).json({ success: false, error: 'Failed to load batch records' });
    }
});

module.exports = router;
