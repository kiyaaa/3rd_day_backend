const ChatClient = require('./base-client');

const client = new ChatClient(
  { email: 'mike@demo.com', password: 'password123' },
  'Mike Park',
  true // is an expert
);

client.init().catch(console.error);