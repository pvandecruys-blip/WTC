const { supabase } = require('./db');

const BUCKET = process.env.SUPABASE_BUCKET || 'wtc-photos';

async function saveImage(file) {
  if (!file) return null;
  const safeBase = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const filename = `${Date.now()}-${safeBase}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });
  if (error) throw new Error('Upload mislukt: ' + error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function deleteImage(url) {
  if (!url) return;
  // URL format: https://xxx.supabase.co/storage/v1/object/public/<bucket>/<filename>
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const filename = url.substring(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([filename]);
}

module.exports = { saveImage, deleteImage };
