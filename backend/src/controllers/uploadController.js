/**
 * EduMind AI - File Upload Controller
 * Task 4 & 5: Upload APIs + Database Connectivity
 * POST /api/upload — accepts PDF/text, extracts text, stores metadata
 */

import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ActivityLogs, UploadedFiles } from '../config/db.js';

export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'No file uploaded.' });
  }

  const { originalname, mimetype, size, path: filePath, filename } = req.file;
  let extractedText = '';

  try {
    if (mimetype === 'application/pdf') {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const buffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text.trim();
    } else if (mimetype.startsWith('text/')) {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    } else {
      fs.unlinkSync(filePath);
      return res.status(415).json({
        status: 'error',
        message: 'Unsupported file type. Only PDF and plain text files are allowed.',
      });
    }

    // Clean up the uploaded file after extraction
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Save metadata to database
    const fileRecord = await UploadedFiles.create({
      user_id:        req.user.id,
      filename:       filename,
      original_name:  originalname,
      mime_type:      mimetype,
      file_size:      size,
      extracted_text: extractedText.slice(0, 100000), // store max 100k chars
      purpose:        req.body.purpose || 'study_material',
    });

    await ActivityLogs.create({
      user_id:    req.user.id,
      user_name:  req.user.name,
      action:     'File Uploaded',
      details:    `${originalname} (${(size / 1024).toFixed(1)}KB) — ${extractedText.length} chars extracted`,
      ip_address: req.ip,
    });

    res.json({
      status: 'success',
      message: 'File processed successfully.',
      data: {
        fileId:         fileRecord?.id || null,
        filename:       originalname,
        mimeType:       mimetype,
        fileSizeKB:     Math.round(size / 1024),
        characterCount: extractedText.length,
        extractedText:  extractedText.slice(0, 50000),
        truncated:      extractedText.length > 50000,
      },
    });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw err;
  }
});
