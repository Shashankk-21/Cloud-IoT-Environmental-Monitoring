import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_MS = 5000;

function MetricCard({ label, value, unit, icon }) {
  return (
    <section className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="metric-label">{label}</p>
        <p className="metric-value">
          {value === null ? '—' : value}
          <span className="metric-unit"> {unit}</span>
        </p>
      </div>
    </section>
  );
}

function App() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState('');

  async function fetchLatest() {
    try {
      const response = await fetch(`${API_URL}/api/data`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
      const data = await response.json();

      setLatest(data);
      setOnline(true);
      setError('');

      setHistory((current) => {
        const point = {
          time: new Date(data.time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          temperature: Number(data.temperature),
          humidity: Number(data.humidity),
          pressure: Number(data.pressure),
        };

        const next = [...current, point];
        return next.slice(-30);
      });
    } catch (err) {
      setOnline(false);
      setError(err.message);
    }
  }

  useEffect(() => {
    fetchLatest();
    const timer = setInterval(fetchLatest, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const lastUpdated = useMemo(() => {
    if (!latest?.time) return 'Waiting for data';
    return new Date(latest.time).toLocaleString();
  }, [latest]);

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">EDGE → CLOUD → DASHBOARD</p>
          <h1>Environmental Monitor</h1>
          <p className="subtitle">
            Raspberry Pi + BME280 sensor telemetry delivered through MQTT and stored in InfluxDB.
          </p>
        </div>
        <div className={`status ${online ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          {online ? 'API Connected' : 'API Offline'}
        </div>
      </header>

      <section className="metric-grid">
        <MetricCard label="Temperature" value={latest?.temperature ?? null} unit="°C" icon="🌡" />
        <MetricCard label="Humidity" value={latest?.humidity ?? null} unit="% RH" icon="💧" />
        <MetricCard label="Pressure" value={latest?.pressure ?? null} unit="hPa" icon="◉" />
      </section>

      <section className="info-strip">
        <div>
          <span>Last reading</span>
          <strong>{lastUpdated}</strong>
        </div>
        <div>
          <span>API endpoint</span>
          <strong>{API_URL}/api/data</strong>
        </div>
        <div>
          <span>Polling interval</span>
          <strong>{POLL_MS / 1000}s</strong>
        </div>
      </section>

      {error && (
        <section className="warning">
          <strong>Waiting for the cloud pipeline.</strong>
          <span>{error}. Start the Node API and make sure the InfluxDB bridge is receiving MQTT messages.</span>
        </section>
      )}

      <section className="chart-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SESSION HISTORY</p>
            <h2>Telemetry trend</h2>
          </div>
          <span className="chart-note">Last {history.length} readings</span>
        </div>

        {history.length < 2 ? (
          <div className="empty-state">Connect the dashboard to the API to populate the live trend.</div>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={30} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temperature" name="Temperature (°C)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="humidity" name="Humidity (% RH)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="pressure" name="Pressure (hPa)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <footer>
        <span>Edge-to-Cloud IoT Environmental Monitoring</span>
        <span>Raspberry Pi • MQTT • Mosquitto • InfluxDB • Node.js • React</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
