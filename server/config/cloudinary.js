const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const ApiError = require('../utils/apiError');

const getCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new ApiError(
      500,
      'Cloudinary media configuration error: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set in server environment.'
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });

  return cloudinary;
};

// Configure Multer memory storage (buffers stream directly to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max limit per file
  }
});

/**
 * Extract Cloudinary publicId from a raw publicId or a Cloudinary asset URL
 */
const extractCloudinaryPublicId = (urlOrId) => {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    return str;
  }
  try {
    const urlObj = new URL(str);
    const pathParts = urlObj.pathname.split('/');
    const uploadIdx = pathParts.findIndex(p => p === 'upload');
    if (uploadIdx !== -1 && uploadIdx + 1 < pathParts.length) {
      let targetParts = pathParts.slice(uploadIdx + 1);
      if (targetParts[0] && /^v\d+$/.test(targetParts[0])) {
        targetParts = targetParts.slice(1);
      }
      return targetParts.join('/');
    }
  } catch (err) {}
  return null;
};

/**
 * Fetch and return the raw buffer of a Cloudinary asset using authenticated signed API download
 */
const fetchCloudinaryAssetBuffer = async (urlOrId, options = {}) => {
  const { resourceType = 'raw', type = 'upload', submissionId = null } = options;
  const cld = getCloudinary();
  const publicId = extractCloudinaryPublicId(urlOrId) || urlOrId;

  if (!publicId) {
    throw new ApiError(400, 'Invalid storage asset reference: public_id could not be determined');
  }

  // 1. Primary retrieval: Signed private download API URL
  const attemptRetrieval = async (rType) => {
    try {
      const privUrl = cld.utils.private_download_url(publicId, '', {
        resource_type: rType,
        type: type,
        expires_at: Math.floor(Date.now() / 1000) + 3600
      });

      const res = await fetch(privUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Verify not HTML error page
        const headerStr = buffer.toString('utf8', 0, 15).toLowerCase();
        if (headerStr.includes('<!doctype') || headerStr.includes('<html')) {
          return { error: true, status: 502, cldError: 'Retrieved HTML response instead of document bytes', resourceType: rType };
        }

        return {
          buffer,
          contentType: res.headers.get('content-type'),
          contentLength: buffer.length,
          publicId,
          resourceType: rType
        };
      }

      const cldErr = res.headers.get('x-cld-error') || res.statusText || 'Access Denied';
      return { error: true, status: res.status, cldError: cldErr, resourceType: rType };
    } catch (fetchErr) {
      return { error: true, status: 500, cldError: fetchErr.message, resourceType: rType };
    }
  };

  // Attempt with requested resourceType
  let result = await attemptRetrieval(resourceType);
  if (!result.error) {
    return result;
  }

  // If primary attempt failed with 401/404, try alternative resourceType ('image' vs 'raw')
  const altType = resourceType === 'raw' ? 'image' : 'raw';
  const altResult = await attemptRetrieval(altType);
  if (!altResult.error) {
    return altResult;
  }

  // Direct fetch fallback if the URL is public and not blocked
  if (typeof urlOrId === 'string' && (urlOrId.startsWith('http://') || urlOrId.startsWith('https://'))) {
    try {
      const directRes = await fetch(urlOrId);
      if (directRes.ok) {
        const arrayBuffer = await directRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const headerStr = buffer.toString('utf8', 0, 15).toLowerCase();
        if (!headerStr.includes('<!doctype') && !headerStr.includes('<html')) {
          return {
            buffer,
            contentType: directRes.headers.get('content-type'),
            contentLength: buffer.length,
            publicId,
            resourceType
          };
        }
      }
    } catch {}
  }

  // Safe diagnostics logging (strictly no secrets, tokens or private URLs logged)
  console.error('[CloudinaryRetrieve Failure]', {
    submissionId,
    publicId,
    primaryStatus: result.status,
    primaryError: result.cldError,
    altStatus: altResult.status,
    altError: altResult.cldError
  });

  throw new ApiError(502, `Failed to retrieve document from storage provider (${result.cldError || 'Storage retrieval rejected'})`);
};

module.exports = {
  cloudinary,
  getCloudinary,
  upload,
  extractCloudinaryPublicId,
  fetchCloudinaryAssetBuffer
};
