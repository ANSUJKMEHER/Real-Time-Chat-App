const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_Ux6ncXWfRoN3@ep-cold-salad-apo7m32y.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then((res) => {
    console.log(res.rows);
    client.end();
  })
  .catch((err) => {
    console.error('Connection error', err.stack);
    client.end();
  });
