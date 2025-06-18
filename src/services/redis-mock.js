const EventEmitter = require('events');
const logger = require('../utils/logger');

class MockRedisService extends EventEmitter {
  constructor() {
    super();
    this.data = new Map();
    this.channels = new Map();
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    logger.info('Mock Redis connected successfully');
  }

  async disconnect() {
    this.connected = false;
    logger.info('Mock Redis disconnected');
  }

  async get(key) {
    const value = this.data.get(key);
    return value ? JSON.stringify(value) : null;
  }

  async set(key, value, expirySeconds = null) {
    this.data.set(key, value);
    
    if (expirySeconds) {
      setTimeout(() => {
        this.data.delete(key);
      }, expirySeconds * 1000);
    }
  }

  async del(key) {
    this.data.delete(key);
  }

  async publish(channel, message) {
    this.emit(channel, message);
  }

  async subscribe(channel, callback) {
    this.on(channel, callback);
  }

  async unsubscribe(channel) {
    this.removeAllListeners(channel);
  }

  async setSession(sessionId, userData, expirySeconds = 86400) {
    const key = `session:${sessionId}`;
    await this.set(key, userData, expirySeconds);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  async cacheQuestion(questionId, questionData, expirySeconds = 3600) {
    const key = `question:${questionId}`;
    await this.set(key, questionData, expirySeconds);
  }

  async getCachedQuestion(questionId) {
    const key = `question:${questionId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async invalidateQuestionCache(questionId) {
    const key = `question:${questionId}`;
    await this.del(key);
  }

  async addToOnlineUsers(userId, socketId) {
    if (!this.data.has('online_users')) {
      this.data.set('online_users', new Map());
    }
    this.data.get('online_users').set(userId.toString(), socketId);
  }

  async removeFromOnlineUsers(userId) {
    const onlineUsers = this.data.get('online_users');
    if (onlineUsers) {
      onlineUsers.delete(userId.toString());
    }
  }

  async getOnlineUsers() {
    const onlineUsers = this.data.get('online_users');
    if (!onlineUsers) return {};
    
    const result = {};
    onlineUsers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  async isUserOnline(userId) {
    const onlineUsers = this.data.get('online_users');
    return onlineUsers ? onlineUsers.has(userId.toString()) : false;
  }

  async incrementMetric(metricName) {
    const key = `metric:${metricName}`;
    const current = this.data.get(key) || 0;
    this.data.set(key, current + 1);
    return current + 1;
  }

  async getMetric(metricName) {
    const key = `metric:${metricName}`;
    return this.data.get(key) || 0;
  }
}

const mockRedisService = new MockRedisService();

module.exports = mockRedisService;