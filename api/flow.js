import crypto from 'crypto';
import brandsHandler from '../brands.js';
import modelsHandler from '../models.js';
import memoryHandler from '../memory.js';
import deviceHandler from '../device.js';

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Temporary storage for order data (in production, use a real database)
const orderDataStore = new Map();

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

// Mock request/response objects for internal calls
function createMockRes() {
  let statusCode = 200;
  let responseData = null;

  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = { statusCode, ...data };
        }
      };
    },
    json: (data) => {
      responseData = { statusCode, ...data };
    },
    getData: () => responseData
  };
}

// Get brands from internal handler
async function getBrands() {
  const mockReq = { query: {} };
  const mockRes = createMockRes();
  
  await brandsHandler(mockReq, mockRes);
  const data = mockRes.getData();
  
  if (data.hasError) {
    return [];
  }
  
  return data.data.map(item => ({
    id: item.id,
    title: item.name
  }));
}

// Get models from internal handler
async function getModels(brand) {
  const mockReq = { query: { brand } };
  const mockRes = createMockRes();
  
  await modelsHandler(mockReq, mockRes);
  const data = mockRes.getData();
  
  if (data.hasError) {
    return [];
  }
  
  return data.data.map(item => ({
    id: item.DeModel,
    title: item.DeModel
  }));
}

// Get memory options from internal handler
async function getMemory(model) {
  const mockReq = { query: { model } };
  const mockRes = createMockRes();
  
  await memoryHandler(mockReq, mockRes);
  const data = mockRes.getData();
  
  if (data.hasError) {
    return [];
  }
  
  // WhatsApp Flow só aceita {id, title} - não pode ter campos extras!
  return data.data.map(item => ({
    id: item.IdObjectSmartphone.toString(),
    title: item.DeMemory
  }));
}

// Get device details from internal handler
async function getDeviceDetails(deviceId) {
  const mockReq = { query: { id: deviceId } };
  const mockRes = createMockRes();
  
  await deviceHandler(mockReq, mockRes);
  const data = mockRes.getData();
  
  if (data.hasError) {
    return null;
  }
  
  return data.data;
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
      console.log('📤 Response to encrypt:', JSON.stringify(responseData));
      const encryptedResponse = encryptResponse(responseData, decryptedAesKey, body.initial_vector);
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
      console.log('🚀 INIT action - Loading first screen');
      console.log('📋 Flow token:', flow_token);
      
      try {
        const brands = await getBrands();
        console.log('✅ Brands loaded:', brands.length, 'brands');
        console.log('📱 First 3 brands:', JSON.stringify(brands.slice(0, 3)));
        
        const initData = {
          screen: 'DEVICE_SELECTION',
          data: {
            brands: brands,
            models: [],
            memories: [],
            selected_brand: '',
            selected_model: '',
            selected_memory: '',
            device_id: ''
          }
        };
        
        console.log('📤 Sending INIT response with', brands.length, 'brands');
        return sendEncryptedResponse(initData);
      } catch (error) {
        console.error('❌ Error in INIT action:', error);
        throw error;
      }
    }

    // Handle data_exchange action
    if (action === 'data_exchange') {
      let responseData = {};

      console.log('🔄 DATA EXCHANGE - Screen:', screen);
      console.log('📊 Request data:', JSON.stringify(requestData));

      // Handle different screens
      if (screen === 'DEVICE_SELECTION') {
        console.log('🔍 Received payload:', JSON.stringify(requestData, null, 2));
        
        // Check if user wants to navigate to next screen
        if (requestData.navigate_to === 'PLAN_SELECTION') {
          console.log('🚀 Navigating to PLAN_SELECTION with device_id:', requestData.device_id);
          
          const deviceId = requestData.device_id;
          if (deviceId) {
            const device = await getDeviceDetails(deviceId);
            console.log('📱 Device details for PLAN_SELECTION:', device);
            
            if (device) {
              console.log('✅ Sending device data:', {
                device_model: device.DeModel,
                device_memory: device.DeMemory,
                device_price: device.FormattedPrice
              });
              
              // Return PLAN_SELECTION screen with device data
              return sendEncryptedResponse({
                screen: 'PLAN_SELECTION',
                data: {
                  device_model: device.DeModel,
                  device_memory: device.DeMemory,
                  device_price: device.FormattedPrice,
                  selected_plan_name: 'Selecione as opções acima',
                  price_display: [
                    {
                      id: 'price',
                      title: 'Selecione as opções acima',
                      description: 'O valor será calculado automaticamente'
                    }
                  ]
                }
              });
            } else {
              console.error('❌ Device not found for ID:', deviceId);
            }
          } else {
            console.error('❌ No device_id received');
          }
        } 
        // Normal DEVICE_SELECTION interactions (dropdowns)
        else {
          // Normal DEVICE_SELECTION interactions
          try {
            const brands = await getBrands();
            console.log(`✅ Brands loaded: ${brands.length}`);
            
            let models = [];
            let memories = [];
            let device_id = '';

            // Se tem brand, carrega modelos
            if (requestData.selected_brand) {
              console.log('🏷️ Loading models for brand:', requestData.selected_brand);
              models = await getModels(requestData.selected_brand);
              console.log(`✅ Loaded ${models.length} models`);
            }

            // Se tem model, carrega memórias
            if (requestData.selected_model) {
              console.log('📱 Loading memories for model:', requestData.selected_model);
              memories = await getMemory(requestData.selected_model);
              console.log(`✅ Loaded ${memories.length} memories`);
            }

            // Se tem memory, o device_id é o próprio ID da memória selecionada
            if (requestData.selected_memory) {
              console.log('💾 Memory selected with ID:', requestData.selected_memory);
              device_id = requestData.selected_memory;
              console.log('✅ Device ID set to:', device_id);
            }

            return sendEncryptedResponse({
              screen: 'DEVICE_SELECTION',
              data: {
                brands: brands,
                models: models,
                memories: memories,
                selected_brand: requestData.selected_brand || '',
                selected_model: requestData.selected_model || '',
                selected_memory: requestData.selected_memory || '',
                device_id: device_id
              }
            });
          } catch (innerError) {
            console.error('❌ Error processing DEVICE_SELECTION:', innerError.message);
            throw innerError;
          }
        }
      }
      else if (screen === 'PLAN_SELECTION') {
        console.log('💰 PLAN_SELECTION - Updating price display');
        console.log('📊 Request data:', JSON.stringify(requestData));
        
        // Get selections
        const selected_plan = requestData.selected_plan || 'super_economico';
        const billing_type = requestData.billing_type || 'mensal';
        const franchise = requestData.franchise || 'normal';
        
        // Base prices
        const basePrices = {
          'super_economico': { mensal: 19.90, anual: 215.00 },
          'economico': { mensal: 34.90, anual: 383.00 },
          'completo': { mensal: 49.90, anual: 539.00 }
        };
        
        const franchiseMultiplier = franchise === 'reduzida' ? 1.15 : 1.0;
        
        // Calculate price for selected plan
        const monthlyPrice = basePrices[selected_plan].mensal * franchiseMultiplier;
        const annualPrice = basePrices[selected_plan].anual * franchiseMultiplier;
        
        const planNames = {
          'super_economico': 'SUPER ECONÔMICO',
          'economico': 'ECONÔMICO',
          'completo': 'COMPLETO'
        };
        
        // UMA variável dinâmica que muda conforme a forma de cobrança
        let dynamicText;
        
        if (billing_type === 'mensal') {
          dynamicText = `Mensalidade de R$ ${monthlyPrice.toFixed(2)}`;
        } else {
          const installments = Math.ceil(annualPrice / 11);
          dynamicText = `11x sem juros de R$ ${installments.toFixed(2)}`;
        }
        
        return sendEncryptedResponse({
          screen: 'PLAN_SELECTION',
          data: {
            device_model: requestData.device_model || '',
            device_memory: requestData.device_memory || '',
            device_price: requestData.device_price || '',
            selected_plan_name: planNames[selected_plan],
            price_display: [
              {
                id: 'price',
                title: dynamicText,
                description: planNames[selected_plan]
              }
            ]
          }
        });
      }
      else if (screen === 'IMEI_VALIDATION') {
        console.log('📱 IMEI_VALIDATION - Validating IMEI or Documents');
        console.log('📊 Request data:', JSON.stringify(requestData));
        
        const imei = requestData.imei;
        const device_documents = requestData.device_documents;
        
        console.log('🔍 IMEI:', imei);
        console.log('📄 Documents:', device_documents);
        
        // Check if at least one validation method is provided
        const hasIMEI = imei && imei.trim().length > 0;
        const hasDocuments = device_documents && Array.isArray(device_documents) && device_documents.length > 0;
        
        console.log('✓ Has IMEI:', hasIMEI);
        console.log('✓ Has Documents:', hasDocuments);
        
        // User must provide IMEI OR at least one document
        if (!hasIMEI && !hasDocuments) {
          console.log('❌ Validation failed: Neither IMEI nor documents provided');
          return sendEncryptedResponse({
            screen: 'IMEI_VALIDATION',
            data: {
              imei_error: 'Forneça o IMEI OU envie pelo menos um documento para continuar.',
              is_validating: false
            }
          });
        }
        
        // If IMEI is provided, validate it (only if provided)
        if (hasIMEI) {
          console.log('🔍 Validating IMEI format...');
          // Validate IMEI format (15 digits)
          if (!/^\d{15}$/.test(imei)) {
            console.log('❌ IMEI format invalid');
            return sendEncryptedResponse({
              screen: 'IMEI_VALIDATION',
              data: {
                imei_error: 'IMEI inválido. Deve conter exatamente 15 dígitos numéricos.',
                is_validating: false
              }
            });
          }
          console.log('✅ IMEI format valid');
        }
        
        // If documents are provided, log them
        if (hasDocuments) {
          console.log(`✅ ${device_documents.length} document(s) uploaded - bypassing IMEI validation`);
        }
        
        // At least one validation method provided - proceed to next screen
        console.log('✅ Validation passed - proceeding to CLIENT_DATA');
        return sendEncryptedResponse({
          screen: 'CLIENT_DATA',
          data: {
            cpf_error: '',
            phone_error: '',
            birth_date_error: ''
          }
        });
      }
      else if (screen === 'CLIENT_DATA') {
        console.log('👤 CLIENT_DATA - Validating client data');
        console.log('📊 Request data:', JSON.stringify(requestData));
        console.log('🔍 Request data keys:', Object.keys(requestData));
        
        const { cpf, phone, full_name, email, birth_date } = requestData;
        
        console.log('🔎 Extracted values:', {
          cpf: cpf || 'UNDEFINED',
          phone: phone || 'UNDEFINED',
          full_name: full_name || 'UNDEFINED',
          email: email || 'UNDEFINED',
          birth_date: birth_date || 'UNDEFINED'
        });
        
        console.log('🔎 Type check:', {
          cpf_type: typeof cpf,
          phone_type: typeof phone,
          full_name_type: typeof full_name,
          email_type: typeof email,
          birth_date_type: typeof birth_date
        });
        
        console.log('🔎 Length check:', {
          cpf_length: cpf ? cpf.length : 0,
          phone_length: phone ? phone.length : 0,
          full_name_length: full_name ? full_name.length : 0,
          email_length: email ? email.length : 0,
          birth_date_length: birth_date ? birth_date.length : 0
        });
        
        let cpf_error = '';
        let phone_error = '';
        let birth_date_error = '';
        let email_error = '';
        
        // Validate full name
        if (!full_name || full_name.trim().length < 3) {
          return sendEncryptedResponse({
            screen: 'CLIENT_DATA',
            data: {
              cpf_error: '',
              phone_error: '',
              birth_date_error: 'Nome completo é obrigatório (mínimo 3 caracteres).'
            }
          });
        }
        
        // Validate email
        if (!email || email.trim().length === 0) {
          return sendEncryptedResponse({
            screen: 'CLIENT_DATA',
            data: {
              cpf_error: '',
              phone_error: '',
              birth_date_error: 'E-mail é obrigatório.'
            }
          });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          return sendEncryptedResponse({
            screen: 'CLIENT_DATA',
            data: {
              cpf_error: '',
              phone_error: '',
              birth_date_error: 'E-mail inválido. Use um formato válido (exemplo@email.com).'
            }
          });
        }
        
        // Validate birth date (must be 18+ years old)
        if (!birth_date) {
          birth_date_error = 'Data de nascimento é obrigatória.';
        } else if (birth_date) {
          const birthDate = new Date(birth_date);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            birth_date_error = 'Você deve ter pelo menos 18 anos para contratar o seguro.';
          }
        }
        
        // Validate CPF (11 digits)
        if (!cpf || cpf.trim().length === 0) {
          cpf_error = 'CPF é obrigatório.';
        }
        
        const cpfClean = cpf ? cpf.replace(/\D/g, '') : '';
        if (!cpf_error && (!cpfClean || cpfClean.length !== 11)) {
          cpf_error = 'CPF inválido. Deve conter 11 dígitos.';
        } else {
          // Validate CPF checksum
          const validateCPF = (cpf) => {
            if (/^(\d)\1{10}$/.test(cpf)) return false; // All same digits
            
            let sum = 0;
            for (let i = 0; i < 9; i++) {
              sum += parseInt(cpf[i]) * (10 - i);
            }
            let digit1 = 11 - (sum % 11);
            if (digit1 >= 10) digit1 = 0;
            
            sum = 0;
            for (let i = 0; i < 10; i++) {
              sum += parseInt(cpf[i]) * (11 - i);
            }
            let digit2 = 11 - (sum % 11);
            if (digit2 >= 10) digit2 = 0;
            
            return digit1 === parseInt(cpf[9]) && digit2 === parseInt(cpf[10]);
          };
          
          if (!validateCPF(cpfClean)) {
            cpf_error = 'CPF inválido. Verifique os números digitados.';
          }
        }
        
        // Validate phone (10 or 11 digits)
        if (!phone || phone.trim().length === 0) {
          phone_error = 'Telefone é obrigatório.';
        }
        
        const phoneClean = phone ? phone.replace(/\D/g, '') : '';
        if (!phone_error && (!phoneClean || (phoneClean.length !== 10 && phoneClean.length !== 11))) {
          phone_error = 'Telefone inválido. Deve conter 10 ou 11 dígitos (DDD + número).';
        }
        
        // If there are errors, return to CLIENT_DATA with error messages
        if (cpf_error || phone_error || birth_date_error) {
          console.log('❌ Validation errors:', { cpf_error, phone_error, birth_date_error });
          return sendEncryptedResponse({
            screen: 'CLIENT_DATA',
            data: {
              cpf_error: cpf_error,
              phone_error: phone_error,
              birth_date_error: birth_date_error
            }
          });
        }
        
        // All valid - save order data and navigate to ORDER_SUMMARY
        console.log('✅ Client data validated successfully');
        
        // Get device and plan data from payload
        const deviceId = requestData.device_id;
        const selectedPlan = requestData.plan;
        const franchise = requestData.franchise;
        const billingType = requestData.billing_type;
        
        console.log('📦 Order data:', { deviceId, selectedPlan, franchise, billingType });
        
        // Build summary for ORDER_SUMMARY screen
        const device = await getDeviceDetails(deviceId);
        
        const basePrices = {
          'super_economico': { mensal: 19.90, anual: 215.00 },
          'economico': { mensal: 34.90, anual: 383.00 },
          'completo': { mensal: 49.90, anual: 539.00 }
        };
        
        const planNames = {
          'super_economico': 'SUPER ECONÔMICO',
          'economico': 'ECONÔMICO',
          'completo': 'COMPLETO'
        };
        
        const franchiseMultiplier = franchise === 'reduzida' ? 1.15 : 1.0;
        const monthlyPrice = basePrices[selectedPlan].mensal * franchiseMultiplier;
        const annualPrice = basePrices[selectedPlan].anual * franchiseMultiplier;
        
        const finalPrice = billingType === 'mensal' ? monthlyPrice : annualPrice;
        const billingLabel = billingType === 'mensal' ? 'Pagamento mensal' : 'Pagamento anual';
        const franchiseLabel = franchise === 'reduzida' ? 'Franquia Reduzida' : 'Franquia Normal';
        
        // Format total with payment type
        let totalDisplay;
        if (billingType === 'mensal') {
          totalDisplay = `Mensal de R$ ${finalPrice.toFixed(2)}`;
        } else {
          const installmentValue = Math.ceil(annualPrice / 11);
          totalDisplay = `11x de R$ ${installmentValue.toFixed(2)} sem juros`;
        }
        
        // Format client data
        const formattedCpf = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        const formattedPhone = phoneClean.length === 11 
          ? phoneClean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
          : phoneClean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        const formattedEmail = email ? email.toLowerCase() : '';
        
        console.log('✅ Summary built for ORDER_SUMMARY');
        console.log('\ud83d\udc64 Client data formatting:', {
          full_name,
          cpfClean,
          formattedCpf,
          email,
          formattedEmail,
          phoneClean,
          formattedPhone,
          birth_date
        });
        
        // Save order data temporarily (in production, use database)
        const orderSummary = {
          client_name: full_name,
          client_cpf: formattedCpf,
          client_email: formattedEmail,
          client_phone: formattedPhone,
          client_birth_date: birth_date,
          device: `${device.DeModel} - ${device.DeMemory}`,
          plan_name: planNames[selectedPlan],
          franchise: franchiseLabel,
          billing_type: billingLabel,
          total: totalDisplay
        };
        
        orderDataStore.set(flow_token, orderSummary);
        console.log('💾 Saved order data for flow_token:', flow_token);
        console.log('📋 Order summary:', orderSummary);
        
        // Navigate to ORDER_SUMMARY with all data
        // WhatsApp Flows TERMINAL SCREENS limitation: Must send ALL text as a SINGLE variable
        // Multiple ${data.field} variables don't work in terminal screens
        const summaryText = `RESUMO DO PEDIDO

DADOS DO CLIENTE
Nome: ${full_name}
CPF: ${formattedCpf}
Email: ${formattedEmail}
Telefone: ${formattedPhone}
Data de Nascimento: ${birth_date}

DADOS DO APARELHO
Dispositivo: ${device.DeModel} - ${device.DeMemory}

PLANO CONTRATADO
Plano: ${planNames[selectedPlan]}
Franquia: ${franchiseLabel}
Forma de Cobrança: ${billingLabel}

VALOR FINAL
${totalDisplay}`;
        
        const responseData = {
          screen: 'ORDER_SUMMARY',
          data: {
            order_id: flow_token,
            summary_text: summaryText
          }
        };
        
        console.log('📤 Sending to ORDER_SUMMARY:', JSON.stringify(responseData, null, 2));
        
        return sendEncryptedResponse(responseData);
      }
      else if (screen === 'ORDER_SUMMARY') {
        console.log('📋 ORDER_SUMMARY - Loading order data');
        console.log('📊 Request data:', JSON.stringify(requestData));
        
        if (requestData.load_order_summary) {
          const orderId = requestData.order_id;
          console.log('🔍 Looking for order_id:', orderId);
          
          const orderSummary = orderDataStore.get(orderId);
          
          if (orderSummary) {
            console.log('✅ Found order data:', orderSummary);
            
            return sendEncryptedResponse({
              screen: 'ORDER_SUMMARY',
              data: {
                order_id: orderId,
                ...orderSummary
              }
            });
          } else {
            console.error('❌ Order data not found for order_id:', orderId);
            return sendEncryptedResponse({
              screen: 'ORDER_SUMMARY',
              data: {
                order_id: orderId,
                client_name: 'Erro ao carregar dados',
                client_cpf: '',
                client_email: '',
                client_phone: '',
                client_birth_date: '',
                device: 'Erro',
                plan_name: 'Erro',
                franchise: '',
                billing_type: '',
                total: 'R$ 0,00'
              }
            });
          }
        }
      }

      throw new Error('Unhandled screen or missing data');
    }

    // Handle complete action (final order submission)
    if (action === 'complete') {
      console.log('✅ COMPLETE - Finalizing order');
      console.log('📊 Complete payload:', JSON.stringify(requestData));
      
      // Combine form data with stored data
      const finalOrder = {
        ...requestData,
        order_timestamp: new Date().toISOString(),
        flow_token: flow_token
      };
      
      console.log('📦 Final order data:', finalOrder);
      
      // In production, save to database and send to insurance provider
      console.log('💾 Order completed successfully!');
      console.log('📋 Final order summary:');
      console.log(`   Cliente: ${finalOrder.client_name}`);
      console.log(`   CPF: ${finalOrder.client_cpf}`);
      console.log(`   Aparelho: ${finalOrder.brand} ${finalOrder.model} ${finalOrder.memory}`);
      console.log(`   Plano: ${finalOrder.plan}`);
      console.log(`   Franquia: ${finalOrder.franchise}`);
      console.log(`   Cobrança: ${finalOrder.billing_type}`);
      
      // Clean up stored data
      orderDataStore.delete(flow_token);
      
      return sendEncryptedResponse({
        data: {
          success_msg: 'Pedido finalizado com sucesso! Em breve entraremos em contato.',
          order_id: flow_token
        }
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
