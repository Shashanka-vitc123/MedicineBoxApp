import React, { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* ----------------------- Utilities ----------------------- */
function getRandomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function calculateBacteriaProbability(turbidity) {
  if (turbidity <= 5) return getRandomInt(0, 20);
  if (turbidity <= 10) return getRandomInt(20, 50);
  return getRandomInt(50, 100);
}
function getStatus(ph, turbidity, bacteriaProb) {
  let score = 0;
  if (ph < 6.5 || ph > 8.5) score += 1;
  if (turbidity > 5) score += 1;
  if (bacteriaProb > 20) score += 2;
  if (score <= 1) return "Safe";
  if (score === 2) return "Warning";
  return "Contaminated";
}
function generateWaterReading() {
  const ph = getRandomFloat(6.3, 8.8, 2);
  const turbidity = getRandomFloat(0, 15, 1);
  const temperature = getRandomFloat(20, 35, 1);
  const bacteria_probability = calculateBacteriaProbability(turbidity);
  const status = getStatus(ph, turbidity, bacteria_probability);
  return {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString(),
    ph,
    turbidity,
    temperature,
    bacteria_probability,
    status,
  };
}
function seedReadings(n = 12) {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(generateWaterReading());
  return arr;
}

/* ----------------------- App ----------------------- */
export default function App() {
  /* Water Bodies */
  const [waterBodies, setWaterBodies] = useState([
    { id: 1, name: "Lake A", readings: seedReadings() },
    { id: 2, name: "River B", readings: seedReadings() },
  ]);

  /* Toilets */
  const [toilets, setToilets] = useState([
    { id: 1, name: "Toilet 1", usage: 0, history: [] },
    { id: 2, name: "Toilet 2", usage: 0, history: [] },
  ]);

  /* Sound (Web Audio API) */
  const audioCtxRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const enableSound = async () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    setSoundEnabled(true);
  };
  const beep = (freq = 880, duration = 0.18) => {
    try {
      if (!soundEnabled) return;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  };

  /* Tickers */
  useEffect(() => {
    const interval = setInterval(() => {
      // Update water bodies (3 metrics + status)
      setWaterBodies((prev) =>
        prev.map((wb) => {
          const prevLatest = wb.readings[wb.readings.length - 1];
          const next = generateWaterReading();
          const readings = [...wb.readings.slice(-59), next];

          // 🔔 beep on transition to Contaminated
          if (
            next.status === "Contaminated" &&
            prevLatest?.status !== "Contaminated"
          ) {
            // double beep to be noticeable
            beep(880, 0.15);
            setTimeout(() => beep(660, 0.12), 180);
          }

          return { ...wb, readings };
        })
      );

      // Update toilets (live usage + small history)
      setToilets((prev) =>
        prev.map((t) => {
          let newUsage = t.usage + getRandomInt(0, 5);
          if (newUsage > 200) newUsage = 0;
          return {
            ...t,
            usage: newUsage,
            history: [
              ...t.history.slice(-19),
              { time: new Date().toLocaleTimeString(), usage: newUsage },
            ],
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [soundEnabled]); // so ctx is resumed before first beep

  /* Handlers */
  const addWaterBody = () =>
    setWaterBodies((prev) => [
      ...prev,
      { id: Date.now(), name: `Water Body ${prev.length + 1}`, readings: seedReadings() },
    ]);
  const removeWaterBody = (id) =>
    setWaterBodies((prev) => prev.filter((w) => w.id !== id));

  const addToilet = () =>
    setToilets((prev) => [
      ...prev,
      { id: Date.now(), name: `Toilet ${prev.length + 1}`, usage: 0, history: [] },
    ]);
  const removeToilet = (id) =>
    setToilets((prev) => prev.filter((t) => t.id !== id));

  /* UI */
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Smart Community Health Monitoring & Early Warning System
            </h1>
            <p className="text-sm text-gray-600">Multi water bodies • Public toilets</p>
          </div>
          <button
            onClick={enableSound}
            className={`px-3 py-1 rounded text-sm ${
              soundEnabled ? "bg-green-600 text-white" : "bg-gray-800 text-white"
            }`}
            title="Enable sound to allow beeps on contamination"
          >
            {soundEnabled ? "🔔 Sound On" : "🔕 Enable Sound"}
          </button>
        </header>

        {/* ---------------- Water Bodies ---------------- */}
        <section className="bg-white p-4 rounded shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Water Bodies</h2>
            <button onClick={addWaterBody} className="bg-blue-600 text-white px-3 py-1 rounded">
              ➕ Add Water Body
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {waterBodies.map((wb) => {
              const latest = wb.readings[wb.readings.length - 1] || {};
              return (
                <div key={wb.id} className="p-4 rounded border bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{wb.name}</h3>
                      <div className="text-xs text-gray-500">
                        Last update: {latest.timestamp || "--"}
                      </div>
                    </div>
                    <button
                      onClick={() => removeWaterBody(wb.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                    >
                      ❌ Remove
                    </button>
                  </div>

                  {/* Status Banner */}
                  <div
                    className={`rounded-lg p-3 text-white font-semibold flex items-center justify-between shadow mb-4 ${
                      latest.status === "Safe"
                        ? "bg-green-600"
                        : latest.status === "Warning"
                        ? "bg-yellow-500 text-black"
                        : "bg-red-600"
                    }`}
                  >
                    <div>
                      <div className="text-sm">Status</div>
                      <div className="text-xl">{latest.status || "--"}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div>pH: {latest.ph ?? "--"}</div>
                      <div>Turbidity: {latest.turbidity ?? "--"} NTU</div>
                      <div>Bacteria: {latest.bacteria_probability ?? "--"}%</div>
                    </div>
                  </div>

                  {/* Charts row: pH • Turbidity • Bacteria% */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* pH */}
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={wb.readings}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" minTickGap={20} />
                          <YAxis domain={[6, 9]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="ph" stroke="#2b6cb0" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Turbidity */}
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={wb.readings}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" minTickGap={20} />
                          <YAxis domain={[0, 15]} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="turbidity"
                            stroke="#d69e2e"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bacteria probability */}
                    <div style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={wb.readings}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="timestamp" minTickGap={20} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="bacteria_probability"
                            stroke="#e53e3e"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------- Public Toilets ---------------- */}
        <section className="bg-white p-4 rounded shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Public Toilets</h2>
            <button onClick={addToilet} className="bg-green-600 text-white px-3 py-1 rounded">
              ➕ Add Toilet
            </button>
          </div>

          {/* Overall live bar chart */}
          <div className="mb-6" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toilets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="usage" name="Usage Count" fill="#3182ce" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Per-toilet historical bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toilets.map((t) => (
              <div key={t.id} className="p-4 bg-gray-100 rounded shadow">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{t.name} — History</h3>
                  <button
                    onClick={() => removeToilet(t.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    ❌ Remove
                  </button>
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={t.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" minTickGap={20} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="usage" fill="#4299e1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-xs text-gray-500">
          Simulated data — swap generators with real sensors/API for production.
        </footer>
      </div>
    </div>
  );
}
