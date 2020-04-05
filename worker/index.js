const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

function fib(n) {
  return n < 2 ? 1 : fib(n - 2) + fib(n - 1);
}

sub.on('message', (channel, message) =>
  redisClient.hset('values', message, fib(parseInt(message)))
);

sub.subscribe('insert');
