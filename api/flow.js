import crypto from 'crypto';

const PRIVATE_KEY = process.env.PRIVATE_KEY;

function decryptRequest(encryptedFlowData, encryptedAesKey, initialVector) {
  try {
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: PRIVATE_KEY,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encryptedAesKey, 'base64')
    );

    const encryptedFlowDataBuffer = Buffer.from(encryptedFlowData, 'base64');
    const ivBuffer = Buffer.from(initialVector, 'base64');
    
    const authTag = encryptedFlowDataBuffer.slice(-16);
    const encryptedData = encryptedFlowDataBuffer.slice(0, -16);

    const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, ivBuffer);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, null, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

function encryptResponse(response, aesKey, initialVector) {
  try {
    const ivBuffer = Buffer.from(initialVector, 'base64');
    const flippedIv = Buffer.alloc(ivBuffer.length);
    for (let i = 0; i < ivBuffer.length; i++) {
      flippedIv[i] = ~ivBuffer[i];
    }

    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, flippedIv);
    let encrypted = cipher.update(JSON.stringify(response), 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    return encryptedWithTag.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log('\n\n========================================');
  console.log('🔵 FLOW ENDPOINT CALLED at', timestamp);
  console.log('========================================');
  console.log('📍 URL:', req.url);
  console.log('🔧 Method:', req.method);
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🌐 Query:', JSON.stringify(req.query || {}, null, 2));
  
  if (req.method !== 'POST') {
    console.log('❌ REJECTED: Invalid method:', req.method);
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    const body = req.body || {};
    console.log('📦 Body type:', typeof body);
    console.log('📦 Body keys:', Object.keys(body));
    console.log('📦 Full body (first 500 chars):', JSON.stringify(body).substring(0, 500));

    // Check if encrypted request
    const hasEncryptedData = !!body.encrypted_flow_data;
    const hasEncryptedKey = !!body.encrypted_aes_key;
    const hasIV = !!body.initial_vector;
    
    console.log('🔒 Encryption check:');
    console.log('   - encrypted_flow_data:', hasEncryptedData);
    console.log('   - encrypted_aes_key:', hasEncryptedKey);
    console.log('   - initial_vector:', hasIV);
    
    if (!hasEncryptedData || !hasEncryptedKey || !hasIV) {
      console.log('❌ REJECTED: Missing encrypted fields');
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing encrypted request fields',
        details: {
          hasEncryptedData,
          hasEncryptedKey,
          hasIV
        }
      });
    }

    console.log('🔐 Attempting decryption...');
    console.log('   - PRIVATE_KEY exists:', !!PRIVATE_KEY);
    console.log('   - PRIVATE_KEY length:', PRIVATE_KEY ? PRIVATE_KEY.length : 0);
    
    // Decrypt request
    const decryptedRequest = decryptRequest(
      body.encrypted_flow_data,
      body.encrypted_aes_key,
      body.initial_vector
    );

    console.log('✅ Decryption successful!');
    console.log('📋 Decrypted request:', JSON.stringify(decryptedRequest, null, 2));
    const { version, action, screen, data: requestData, flow_token } = decryptedRequest;

    // Decrypt AES key for response encryption
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: PRIVATE_KEY,
        oaepHash: 'sha256',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(body.encrypted_aes_key, 'base64')
    );

    // Helper function to send encrypted response
    const sendEncryptedResponse = (responseData) => {
      const fullResponse = { version: '3.0', ...responseData };
      console.log('📤 Response to encrypt:', JSON.stringify(fullResponse));
      const encryptedResponse = encryptResponse(fullResponse, decryptedAesKey, body.initial_vector);
      console.log('✅ Response encrypted and sent');
      return res.status(200).send(encryptedResponse);
    };

    // Handle health check (ping) request
    if (action === 'ping') {
      console.log('🏥 Health check request detected');
      return sendEncryptedResponse({
        data: {
          status: 'active'
        }
      });
    }

    // Handle error notification from client
    if (requestData?.error) {
      console.warn('⚠️ Client error received:', requestData.error);
      return sendEncryptedResponse({
        data: {
          acknowledged: true
        }
      });
    }

    // Handle INIT action (when user opens the flow)
    if (action === 'INIT') {
      console.log('🚀 INIT action - Loading INSURANCE_SELECTION screen');
      return sendEncryptedResponse({
        screen: 'INSURANCE_SELECTION',
        data: {}
      });
    }

    // Handle data_exchange action
    if (action === 'data_exchange') {
      console.log('🔄 DATA EXCHANGE - Screen:', screen);
      console.log('📊 Request data:', JSON.stringify(requestData));

      if (screen === 'PAYMENT') {
        const paymentMethod = requestData.payment_method;
        console.log('💳 Payment method selected:', paymentMethod);

        if (paymentMethod === 'SUCCESS_PIX') {
          return sendEncryptedResponse({
            screen: 'SUCCESS_PIX',
            data: {
              qr_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUoAAAFKCAIAAAD0S4FSAAAFjklEQVR4nO3dQW4rNxBAQU+Q+19Z2WYlfIRmmnxTtZclj/TQmwb5fD6fH6Dor+kPAOwib8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlD1t9Tb/w8z0/L5/O57llNfebv7+u38VtMb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyBrbWpvaplpx5jbVyrPat1u27xv02/hzpjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2QdurX2trPH9v3l7//Rvr20qZ22G38b+5jekCVvyJI3ZMkbsuQNWfKGLHlDlrwhS96QdeXW2tvY8eK/Mb0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCHL1toFpm4mvfF0Mf7N9IYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhqwrt9Z621RTN3V+t/Laqe+o99tYYXpDlrwhS96QJW/IkjdkyRuy5A1Z8oYseUPWoVtrU6eLvc3UttzKbpnfxp8zvSFL3pAlb8iSN2TJG7LkDVnyhix5Q5a8IWtsa82ZWL/1rKa2uPbtpflt/BbTG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsp6pDaGpWy/3OXPXat+z2vf/+n5/i+kNWfKGLHlDlrwhS96QJW/IkjdkyRuy5A1Zh94Q+t3UTtuZd2Lu2x5722fuMb0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCFr7Ky1G08Im9rE2vesbtz/673vPqY3ZMkbsuQNWfKGLHlDlrwhS96QJW/IkjdkHXrW2r5TzVZee+Ze2ts2sfb5XHgv7XemN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZB26tbayIbRvu+jM7bEVU/t/U+fDPReeS7fC9IYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhqyxG0LPPAPszC2ufd/Rvved2g878zlPMb0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCHr0K21M0/qWvnLbzvF7bsb98Oeod/GCtMbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuyDr0h9LszzwDb975n7kv1zof77sbdQdMbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuyrtxam7pd9MZbL78789S63s2zU0xvyJI3ZMkbsuQNWfKGLHlDlrwhS96QJW/IGrsh9G3O3LS78dS6G2+enWJ6Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlD1tjW2pk3Kq64cQNsaqdt6uS5z4Xf0QrTG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsg69IfTMk6um7uJcsW+La58zP9WNn9n0hix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGrCu31t5mZSNq6k7MM31e9jRMb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyLK1dv2u1dTJcyu7dFOvvfFbWGF6Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlD1pVba2fe43nj5tmZ/9GNO21nMr0hS96QJW/IkjdkyRuy5A1Z8oYseUOWvCHrmdrjOfNsqhVT21QrT9K3//+Yes6mN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZI1trQG7md6QJW/IkjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhix5Q5a8IUvekCVvyJI3ZMkbsuQNWfKGLHlDlrwhS96QJW/IkjdkyRuy5A1Z8oYseUOWvCFL3pAlb8iSN2TJG7LkDVnyhix5w0/VP1Syi5XNJmnNAAAAAElFTkSuQmCC'
            }
          });
        }

        if (paymentMethod === 'SUCCESS_CARD') {
          return sendEncryptedResponse({
            screen: 'SUCCESS_CARD',
            data: {}
          });
        }

        // No valid method selected — stay on PAYMENT screen
        return sendEncryptedResponse({
          screen: 'PAYMENT',
          data: {}
        });
      }

      throw new Error('Unhandled screen: ' + screen);
    }

    // Handle complete action (user clicked "Finalizar" on terminal screen)
    if (action === 'complete') {
      console.log('✅ COMPLETE - Flow finished');
      console.log('📊 Complete payload:', JSON.stringify(requestData));
      return sendEncryptedResponse({
        data: {}
      });
    }

    // Unknown action
    console.error('❌ Unknown action:', action);
    return sendEncryptedResponse({
      data: {
        error_msg: 'Unknown action'
      }
    });

  } catch (error) {
    console.error('\n❌❌❌ CRITICAL ERROR ❌❌❌');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================\n');
    
    // If decryption fails, return 421 to refresh keys
    if (error.message.includes('Decryption failed')) {
      console.error('🔑 Decryption error - returning 421 to refresh keys');
      return res.status(421).send();
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
