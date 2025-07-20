const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload folder exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'turnover');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // timestamp + original name (sanitized)
    const safeName = file.originalname.replace(/[^\w.-]/g, '_');
    const ext = path.extname(safeName) || '.pdf';
    cb(null, Date.now() + ext);
  }
});

// Accept only pdf
function fileFilter(req, file, cb) {
  if (
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'));
  }
}

const turnoverUpload = multer({
  // storage,
  // fileFilter,
  // limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = turnoverUpload;
