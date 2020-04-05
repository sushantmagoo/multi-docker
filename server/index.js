const keys = require('./keys');
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const redis = require('redis');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// * postgres config
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('lost postgres connections'));
pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(e => console.log(e));

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const pub = redisClient.duplicate();

app.get('/', (_, res) => res.send('Hi'));
app.get('/values/all', async (_, res) => {
  const values = await pgClient.query('SELECT * from values');
  return res.send(values.rows);
});
app.get('/values/current', (_, res) => {
  redisClient.hgetall('values', (__, vals) => {
    return res.send(vals);
  });
});
app.post('/values', async (req, res) => {
  const { index } = req.body;
  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }
  redisClient.hset('values', index, 'Nothing yet!');
  pub.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  return res.send({ working: true });
});

app.listen(5000, () => console.log('listening on port: ' + 5000));
