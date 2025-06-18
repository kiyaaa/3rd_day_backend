const ChatClient = require('./base-client');

const client = new ChatClient(
  { email: 'alex@demo.com', password: 'password123' },
  'Alex Kim',
  false // not an expert
);

client.init().catch(console.error);