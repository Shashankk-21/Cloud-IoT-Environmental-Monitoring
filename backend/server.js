const express = require('express');
const cors = require('cors');
const Influx = require('influx');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

const influx = new Influx.InfluxDB({
  host: process.env.INFLUX_HOST || 'localhost',
  port: Number(process.env.INFLUX_PORT || 8086),
  database: process.env.INFLUX_DB || 'weather',
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Edge-to-Cloud IoT Environmental Monitoring API',
    status: 'running',
    endpoint: '/api/data',
  });
});

app.get('/api/data', async (_req, res) => {
  try {
    const result = await influx.query(`
      SELECT * FROM sensor_readings
      ORDER BY time DESC
      LIMIT 1
    `);

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'No data found in database' });
    }

    const data = result[0];

    return res.json({
      time: new Date(new Date(data.time).getTime()).toISOString(),
      temperature: Number(data.temperature),
      humidity: Number(data.humidity),
      pressure: Number(data.pressure),
    });
  } catch (err) {
    console.error('Error fetching data:', err.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[+] Weather API running on http://localhost:${PORT}`);
});
