const ChatClient = require('./base-client');

const client = new ChatClient(
  { email: 'sarah@demo.com', password: 'password123' },
  'Sarah Lee',
  true // is an expert
);

client.init().catch(console.error);