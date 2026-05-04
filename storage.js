const fs = require('fs');
const path = require('path');

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!useBlob && !fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

async function saveImage(file) {
  if (!file) return null;
  const safeBase = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const filename = `${Date.now()}-${safeBase}`;

  if (useBlob) {
    const { put } = require('@vercel/blob');
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimetype
    });
    return blob.url;
  }

  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}

async function deleteImage(urlOrFile) {
  if (!urlOrFile) return;

  if (useBlob && urlOrFile.startsWith('http')) {
    try {
      const { del } = require('@vercel/blob');
      await del(urlOrFile);
    } catch (e) { /* ignore */ }
    return;
  }

  if (urlOrFile.startsWith('/uploads/')) {
    const p = path.join(__dirname, urlOrFile);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function localUploadDir() {
  return UPLOAD_DIR;
}

module.exports = { saveImage, deleteImage, localUploadDir, useBlob };
