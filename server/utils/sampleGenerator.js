// server/utils/sampleGenerator.js
const fs = require('fs');
const path = require('path');

// Sample contacts data
const sampleContacts = [
  { name: "Ravi Kumar", wa_id: "919937320320" },
  { name: "Neha Joshi", wa_id: "929967673820" },
  { name: "Amit Singh", wa_id: "917845129630" },
  { name: "Priya Sharma", wa_id: "918765432109" },
  { name: "Rahul Patel", wa_id: "919876543210" },
  { name: "Sneha Gupta", wa_id: "917890123456" }
];

// Sample messages
const sampleMessages = [
  "Hi there! How are you doing?",
  "Can we meet tomorrow for coffee?",
  "Did you check the document I sent?",
  "Happy birthday! 🎂🎉",
  "What time is the meeting?",
  "I'll be there in 10 minutes",
  "Thanks for your help!",
  "Could you please send me the details?",
  "Have a great weekend!",
  "The project deadline is next Friday"
];

// Generate a random timestamp within the last week
const getRandomTimestamp = () => {
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  return Math.floor(Math.random() * (now - oneWeekAgo)) + oneWeekAgo;
};

// Generate a random message
const getRandomMessage = () => {
  return sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
};

// Generate a sample conversation
const generateConversation = (contact, index) => {
  const conversationId = `conv${index + 3}`;
  const messages = [];
  const statuses = [];
  
  // Generate 3-5 messages per conversation
  const messageCount = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < messageCount; i++) {
    const timestamp = getRandomTimestamp();
    const isInbound = i % 2 === 0; // Alternate between inbound and outbound
    const messageId = `wamid.HBgM${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}=`;
    
    // Create message
    const message = {
      payload_type: "whatsapp_webhook",
      _id: `${conversationId}-msg${i + 1}-${isInbound ? 'user' : 'api'}`,
      metaData: {
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  contacts: [
                    {
                      profile: {
                        name: contact.name
                      },
                      wa_id: contact.wa_id
                    }
                  ],
                  messages: [
                    {
                      from: isInbound ? contact.wa_id : "918329446654",
                      id: messageId,
                      timestamp: timestamp.toString(),
                      text: {
                        body: getRandomMessage()
                      },
                      type: "text"
                    }
                  ],
                  messaging_product: "whatsapp",
                  metadata: {
                    display_phone_number: "918329446654",
                    phone_number_id: "629305560276479"
                  }
                }
              }
            ],
            id: `30164062719905${index * 10 + i}`
          }
        ],
        gs_app_id: `${conversationId}-app`,
        object: "whatsapp_business_account"
      },
      createdAt: new Date(timestamp * 1000).toISOString(),
      startedAt: new Date(timestamp * 1000).toISOString(),
      completedAt: new Date((timestamp + 1) * 1000).toISOString(),
      executed: true
    };
    
    messages.push(message);
    
    // Create status update for outbound messages
    if (!isInbound) {
      const statusTypes = ["sent", "delivered", "read"];
      const statusType = statusTypes[Math.floor(Math.random() * statusTypes.length)];
      
      const status = {
        payload_type: "whatsapp_webhook",
        _id: `${conversationId}-msg${i + 1}-status`,
        metaData: {
          entry: [
            {
              changes: [
                {
                  field: "messages",
                  value: {
                    messaging_product: "whatsapp",
                    metadata: {
                      display_phone_number: "918329446654",
                      phone_number_id: "629305560276479"
                    },
                    statuses: [
                      {
                        conversation: {
                          id: `${conversationId}-convo-id`,
                          origin: {
                            type: "user_initiated"
                          }
                        },
                        gs_id: `${conversationId}-msg${i + 1}-gs-id`,
                        id: messageId,
                        meta_msg_id: messageId,
                        recipient_id: contact.wa_id,
                        status: statusType,
                        timestamp: (timestamp + 20).toString()
                      }
                    ]
                  }
                }
              ],
              id: `30164062719905${index * 10 + i + 100}`
            }
          ],
          gs_app_id: `${conversationId}-app`,
          object: "whatsapp_business_account",
          startedAt: new Date((timestamp + 20) * 1000).toISOString(),
          completedAt: new Date((timestamp + 21) * 1000).toISOString(),
          executed: true
        }
      };
      
      statuses.push(status);
    }
  }
  
  return [...messages, ...statuses];
};

// Generate sample files
const generateSampleFiles = () => {
  const samplesDir = path.join(__dirname, '../../samples');
  
  // Create samples directory if it doesn't exist
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }
  
  // Generate conversations for each contact
  sampleContacts.forEach((contact, index) => {
    if (index < 2) return; // Skip the first two contacts as they already have samples
    
    const conversation = generateConversation(contact, index);
    
    // Write each message and status to a file
    conversation.forEach((item, i) => {
      const fileName = `conversation_${index + 3}_${item._id.includes('status') ? 'status' : 'message'}_${i + 1}.json`;
      const filePath = path.join(samplesDir, fileName);
      
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
    });
  });
  
  console.log(`Generated sample files in ${samplesDir}`);
};

module.exports = { generateSampleFiles };