import crypto from 'crypto';

// ==========================================
// WHATSAPP WEBHOOK HANDLER
// ==========================================
// Handles verification and incoming messages from WhatsApp Cloud API

export default async function handler(req, res) {
  const { method } = req;

  // ==========================================
  // GET - WEBHOOK VERIFICATION
  // ==========================================
  // WhatsApp sends a GET request to verify the webhook URL
  if (method === 'GET') {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('📞 Webhook verification request received');
      console.log('Mode:', mode);
      console.log('Token:', token);

      // Define your verify token (set this in WhatsApp dashboard)
      const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'meu_token_secreto_12345';

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verified successfully');
        return res.status(200).send(challenge);
      } else {
        console.log('❌ Webhook verification failed');
        return res.status(403).send('Forbidden');
      }
    } catch (error) {
      console.error('❌ Error in webhook verification:', error);
      return res.status(500).json({ error: 'Verification failed' });
    }
  }

  // ==========================================
  // POST - RECEIVE WEBHOOK NOTIFICATIONS
  // ==========================================
  // WhatsApp sends POST requests with message notifications, status updates, etc.
  if (method === 'POST') {
    try {
      // Verify webhook signature
      const signature = req.headers['x-hub-signature-256'];
      const appSecret = process.env.WHATSAPP_APP_SECRET;

      if (!signature || !appSecret) {
        console.log('⚠️ Missing signature or app secret');
        return res.status(400).json({ error: 'Missing signature or app secret' });
      }

      // Validate signature
      const body = JSON.stringify(req.body);
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.log('❌ Invalid signature');
        console.log('Received signature:', signature);
        console.log('Expected signature:', expectedSignature);
        console.log('Body used for validation:', body.substring(0, 200) + '...');
        // TEMPORÁRIO: Aceitar mesmo com assinatura inválida para debug
        console.log('⚠️ Continuing anyway for debugging...');
        // return res.status(401).json({ error: 'Invalid signature' });
      } else {
        console.log('✅ Signature validated');
      }

      console.log('📨 Webhook payload:', JSON.stringify(req.body, null, 2));

      // Extract webhook data
      const { entry } = req.body;

      if (!entry || entry.length === 0) {
        console.log('⚠️ No entry in webhook payload');
        return res.status(200).json({ status: 'ok' });
      }

      // Process each entry
      for (const item of entry) {
        const changes = item.changes || [];

        for (const change of changes) {
          const { value, field } = change;

          if (field === 'messages') {
            await handleMessages(value);
          } else if (field === 'message_template_status_update') {
            await handleTemplateStatusUpdate(value);
          } else {
            console.log('📬 Other webhook event:', field);
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return res.status(200).json({ status: 'received' });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Still return 200 to prevent WhatsApp from retrying
      return res.status(200).json({ status: 'error', message: error.message });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

// ==========================================
// HANDLE INCOMING MESSAGES
// ==========================================
async function handleMessages(value) {
  const { messages, contacts, metadata } = value;

  if (!messages || messages.length === 0) {
    console.log('⚠️ No messages in webhook');
    return;
  }

  const phoneNumberId = metadata?.phone_number_id;
  const displayPhoneNumber = metadata?.display_phone_number;

  console.log('📱 Phone number ID:', phoneNumberId);
  console.log('📞 Display phone:', displayPhoneNumber);

  for (const message of messages) {
    const { from, id, type, timestamp } = message;
    const contact = contacts?.find(c => c.wa_id === from);
    const contactName = contact?.profile?.name || 'Unknown';

    console.log('\n📩 New message received:');
    console.log('From:', from, `(${contactName})`);
    console.log('Message ID:', id);
    console.log('Type:', type);
    console.log('Timestamp:', timestamp);

    // Process different message types
    switch (type) {
      case 'text':
        await handleTextMessage(message, from, contactName);
        break;

      case 'interactive':
        await handleInteractiveMessage(message, from, contactName);
        break;

      case 'button':
        await handleButtonReply(message, from, contactName);
        break;

      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        await handleMediaMessage(message, from, contactName, type);
        break;

      default:
        console.log('⚠️ Unsupported message type:', type);
    }
  }

  // Handle status updates (message delivery, read receipts, etc)
  if (value.statuses) {
    await handleStatusUpdates(value.statuses);
  }
}

// ==========================================
// HANDLE TEXT MESSAGES
// ==========================================
async function handleTextMessage(message, from, contactName) {
  const text = message.text?.body;
  console.log('💬 Text message:', text);

  // 🎉 RESPOSTA AUTOMÁTICA COM FLOW!
  
  // Se a mensagem for do Message Link ou contiver palavras-chave, envia o Flow
  if (
    text.toLowerCase().includes('contrate') ||
    text.toLowerCase().includes('agora') || 
    text.toLowerCase().includes('Contrate seu seguro agora')
  ) {
    await sendFlowTemplate(from);
  } else {
    // Senão, envia mensagem com instruções
    await sendTextMessage(from, `Oi ${contactName}! 👋\n\nDigite *cotar* ou *seguro* para iniciar uma cotação!`);
  }
}

// ==========================================
// HANDLE INTERACTIVE MESSAGES
// ==========================================
async function handleInteractiveMessage(message, from, contactName) {
  const interactive = message.interactive;
  const type = interactive?.type; // 'button_reply', 'list_reply', 'nfm_reply'

  console.log('🔘 Interactive message type:', type);

  if (type === 'button_reply') {
    const buttonId = interactive.button_reply?.id;
    const buttonTitle = interactive.button_reply?.title;
    console.log('Button clicked:', buttonId, '-', buttonTitle);
  } else if (type === 'list_reply') {
    const listId = interactive.list_reply?.id;
    const listTitle = interactive.list_reply?.title;
    console.log('List item selected:', listId, '-', listTitle);
  } else if (type === 'nfm_reply') {
    // Flow completion
    const flowResponse = interactive.nfm_reply;
    console.log('📋 Flow completed:', flowResponse);
  }

  // TODO: Implement your business logic
}

// ==========================================
// HANDLE BUTTON REPLIES
// ==========================================
async function handleButtonReply(message, from, contactName) {
  const buttonPayload = message.button?.payload;
  const buttonText = message.button?.text;

  console.log('🔘 Button reply:', buttonText, '-', buttonPayload);

  // TODO: Implement your business logic
}

// ==========================================
// HANDLE MEDIA MESSAGES
// ==========================================
async function handleMediaMessage(message, from, contactName, type) {
  const media = message[type];
  const mediaId = media?.id;
  const mimeType = media?.mime_type;
  const caption = media?.caption;

  console.log(`📎 ${type.toUpperCase()} received:`, mediaId);
  console.log('MIME type:', mimeType);
  if (caption) console.log('Caption:', caption);

  // TODO: Download and process media file
  // Use: GET https://graph.facebook.com/v21.0/{media_id}
  // Then download from the returned URL
}

// ==========================================
// HANDLE STATUS UPDATES
// ==========================================
async function handleStatusUpdates(statuses) {
  for (const status of statuses) {
    const { id, status: messageStatus, timestamp, recipient_id } = status;

    console.log('\n📊 Message status update:');
    console.log('Message ID:', id);
    console.log('Status:', messageStatus); // sent, delivered, read, failed
    console.log('Recipient:', recipient_id);
    console.log('Timestamp:', timestamp);

    // TODO: Update database with delivery status
  }
}

// ==========================================
// HANDLE TEMPLATE STATUS UPDATES
// ==========================================
async function handleTemplateStatusUpdate(value) {
  console.log('📋 Template status update:', value);
  // TODO: Handle template approval/rejection notifications
}

// ==========================================
// SEND TEXT MESSAGE (Helper function)
// ==========================================
async function sendTextMessage(to, text) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text }
        })
      }
    );

    const data = await response.json();
    console.log('✅ Text message sent:', data);
    return data;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
}

// ==========================================
// SEND FLOW TEMPLATE (Helper function)
// ==========================================
async function sendFlowTemplate(to) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = 'teste_pme';
  const templateLanguage = 'pt_BR';

  // Gera um flow_token único para rastrear esta conversa
  const flowToken = `FLOW_${Date.now()}_${to}`;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: templateLanguage
            },
            components: [
              {
                type: 'button',
                sub_type: 'flow',
                index: '1',
                parameters: [
                  {
                    type: 'action',
                    action: {
                      flow_token: flowToken
                    }
                  }
                ]
              }
            ]
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error sending template:', JSON.stringify(data.error, null, 2));
    } else {
      console.log('✅ Template sent:', data);
      console.log('📋 Flow token:', flowToken);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error sending template:', error.message);
    throw error;
  }
}
