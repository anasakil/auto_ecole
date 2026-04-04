const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'files_autoecole';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Upload a buffer to Supabase Storage.
 * @param {Buffer} buffer - File content
 * @param {string} folder - e.g. 'profiles', 'documents', 'contracts'
 * @param {string} fileName - e.g. '1234-abc.pdf'
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL
 */
async function uploadToStorage(buffer, folder, fileName, contentType) {
  const supabase = getSupabase();
  const storagePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Supabase Storage upload error: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage by its public URL or storage path.
 * @param {string} urlOrPath - Public URL or path like 'profiles/xxx.jpg'
 */
async function deleteFromStorage(urlOrPath) {
  const supabase = getSupabase();
  let storagePath = urlOrPath;

  // Extract path from full public URL if needed
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) {
    storagePath = urlOrPath.slice(idx + marker.length);
  }

  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) console.error('Supabase Storage delete error:', error.message);
}

/**
 * Check if a string is a Supabase Storage public URL for this bucket.
 */
function isStorageUrl(str) {
  return typeof str === 'string' && str.startsWith('http') && str.includes(`/storage/v1/object/public/${BUCKET}/`);
}

module.exports = { uploadToStorage, deleteFromStorage, isStorageUrl, BUCKET };
