const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(idToken);

    // Generate timestamp
    const timestamp = Math.round(new Date().getTime() / 1000);

    // IMPORTANT: Define the upload parameters that will be signed
    // These MUST match exactly what you send to Cloudinary
    const uploadParams = {
      timestamp: timestamp,
      folder: 'profile_pictures', // Include folder in signature
    };

    // Generate signature with the upload parameters
    const signature = cloudinary.utils.api_sign_request(
      uploadParams,
      process.env.CLOUDINARY_API_SECRET
    );

    console.log('✅ Signature generated successfully');
    console.log('📝 Signed params:', uploadParams);

    // Return all necessary data to the client
    res.status(200).json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: 'profile_pictures', // Also send folder to client
    });
  } catch (error) {
    console.error('❌ API Route Error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

module.exports = handler;