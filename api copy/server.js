require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

// --- MongoDB Atlas connection
const uri = process.env.MONGO_URI; 
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let vitalsCollection;
let alertsCollection;

async function initDb() {
  await client.connect();
  const db = client.db('MedicalSense'); 
  vitalsCollection = db.collection('vitals');
  alertsCollection = db.collection('alerts');
  console.log('Connected to MongoDB Atlas');
}
initDb().catch(console.error);

// --- Thresholds
const thresholds = {
  heartRate: { min: 50, max: 110 },
  spo2: { min: 90, max: 100 },
  tempC: { min: 35, max: 38 },
  airQuality: { max: 100 },
};

// --- Routes
app.get('/', (req, res) => res.send('MedicalSense API'));

// --- Vitals POST
app.post('/api/v1/vitals', async (req, res) => {
  try {
    const payload = req.body;
    payload.ts = payload.ts ? new Date(payload.ts) : new Date();
    payload.patientId = payload.patientId || 'unknown';

    // Insert vital
    const result = await vitalsCollection.insertOne(payload);

    // --- Anomaly detection
    const alerts = [];
    if (payload.heartRate < thresholds.heartRate.min)
      alerts.push({ type: 'heartRate', details: { value: payload.heartRate, alert: 'Low' } });
    if (payload.heartRate > thresholds.heartRate.max)
      alerts.push({ type: 'heartRate', details: { value: payload.heartRate, alert: 'High' } });
    if (payload.spo2 < thresholds.spo2.min)
      alerts.push({ type: 'spo2', details: { value: payload.spo2, alert: 'Low' } });
    if (payload.tempC < thresholds.tempC.min)
      alerts.push({ type: 'temp', details: { value: payload.tempC, alert: 'Low' } });
    if (payload.tempC > thresholds.tempC.max)
      alerts.push({ type: 'temp', details: { value: payload.tempC, alert: 'High' } });
    if (payload.airQuality > thresholds.airQuality.max)
      alerts.push({ type: 'airQuality', details: { value: payload.airQuality, alert: 'Poor' } });

    // Insert and broadcast alerts
    for (const a of alerts) {
      const alertDoc = { patientId: payload.patientId, ...a, ts: new Date(), acknowledged: false };
      await alertsCollection.insertOne(alertDoc);
      io.emit('alert', alertDoc);
      console.log('ALERT CREATED:', alertDoc);
    }

    // Broadcast vitals
    io.emit('vital', payload);
    res.status(201).json({ ok: true });

  } catch (err) {
    console.error('Error /api/v1/vitals', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// --- Historical vitals
app.get('/api/v1/patients/:id/vitals', async (req, res) => {
  const id = req.params.id;
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 1000*60*60*24);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const docs = await vitalsCollection.find({ patientId: id, ts: { $gte: from, $lte: to } }).sort({ ts: 1 }).toArray();
  res.json(docs);
});

// --- Historical alerts
app.get('/api/v1/patients/:id/alerts', async (req, res) => {
  const id = req.params.id;
  const docs = await alertsCollection.find({ patientId: id }).sort({ ts: -1 }).toArray();
  res.json(docs);
});

// --- All patients' vitals
app.get('/api/v1/vitals', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 1000*60*60*24);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    
    const docs = await vitalsCollection
      .find({ ts: { $gte: from, $lte: to } })
      .sort({ ts: 1 })
      .toArray();
    
    res.json(docs);
  } catch (err) {
    console.error('Error fetching all vitals:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});



// --- Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`API listening on ${PORT}`));


// Was a test server without submitting data to MongoDB

// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const { MongoClient, ServerApiVersion } = require('mongodb');
// const bodyParser = require('body-parser');
// const cors = require('cors');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin: '*' } });

// app.use(cors());
// app.use(bodyParser.json());

// // --- Test mode toggle
// const TEST_MODE = process.env.TEST_MODE === 'true';
// if (TEST_MODE) console.log('⚠️ Running in TEST MODE – database inserts are disabled');

// // --- MongoDB Atlas connection
// const uri = process.env.MONGO_URI; 
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// let vitalsCollection;
// let alertsCollection;

// async function initDb() {
//   await client.connect();
//   const db = client.db('MedicalSense'); // Database name
//   vitalsCollection = db.collection('vitals');
//   alertsCollection = db.collection('alerts');
//   console.log('Connected to MongoDB Atlas');
// }
// if (!TEST_MODE) {
//   initDb().catch(console.error);
// }

// // --- Thresholds
// const thresholds = {
//   heartRate: { min: 50, max: 110 },
//   spo2: { min: 90, max: 100 },
//   tempC: { min: 35, max: 38 },
//   airQuality: { max: 100 },
// };

// // --- Routes
// app.get('/', (req, res) => res.send('MedicalSense API'));

// ///////////
// // --- All patients' vitals
// app.get('/api/v1/vitals/all', async (req, res) => {
//   if (TEST_MODE) return res.json([]);

//   const docs = await vitalsCollection.find({}).sort({ ts: 1 }).toArray();
//   res.json(docs);
// });


// ////////////

// // --- Vitals POST
// app.post('/api/v1/vitals', async (req, res) => {
//   try {
//     const payload = req.body;
//     payload.ts = payload.ts ? new Date(payload.ts) : new Date();
//     payload.patientId = payload.patientId || 'unknown';

//     // Insert vital (skip if TEST_MODE)
//     if (!TEST_MODE) {
//       await vitalsCollection.insertOne(payload);
//     }

//     // --- Anomaly detection
//     const alerts = [];
//     if (payload.heartRate < thresholds.heartRate.min)
//       alerts.push({ type: 'heartRate', details: { value: payload.heartRate, alert: 'Low' } });
//     if (payload.heartRate > thresholds.heartRate.max)
//       alerts.push({ type: 'heartRate', details: { value: payload.heartRate, alert: 'High' } });
//     if (payload.spo2 < thresholds.spo2.min)
//       alerts.push({ type: 'spo2', details: { value: payload.spo2, alert: 'Low' } });
//     if (payload.tempC < thresholds.tempC.min)
//       alerts.push({ type: 'temp', details: { value: payload.tempC, alert: 'Low' } });
//     if (payload.tempC > thresholds.tempC.max)
//       alerts.push({ type: 'temp', details: { value: payload.tempC, alert: 'High' } });
//     if (payload.airQuality > thresholds.airQuality.max)
//       alerts.push({ type: 'airQuality', details: { value: payload.airQuality, alert: 'Poor' } });

//     // Insert and broadcast alerts (skip DB insert if TEST_MODE)
//     for (const a of alerts) {
//       const alertDoc = { patientId: payload.patientId, ...a, ts: new Date(), acknowledged: false };
//       if (!TEST_MODE) await alertsCollection.insertOne(alertDoc);
//       io.emit('alert', alertDoc);
//       console.log('ALERT CREATED:', alertDoc);
//     }

//     // Broadcast vitals
//     io.emit('vital', payload);
//     res.status(201).json({ ok: true });

//   } catch (err) {
//     console.error('Error /api/v1/vitals', err);
//     res.status(500).json({ ok: false, message: err.message });
//   }
// });

// // --- Historical vitals
// app.get('/api/v1/patients/:id/vitals', async (req, res) => {
//   const id = req.params.id;
//   const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 1000*60*60*24);
//   const to = req.query.to ? new Date(req.query.to) : new Date();

//   if (TEST_MODE) {
//     return res.json([]); // Empty array in test mode
//   }

//   const docs = await vitalsCollection.find({ patientId: id, ts: { $gte: from, $lte: to } })
//                                     .sort({ ts: 1 }).toArray();
//   res.json(docs);
// });

// // --- Historical alerts
// app.get('/api/v1/patients/:id/alerts', async (req, res) => {
//   const id = req.params.id;

//   if (TEST_MODE) {
//     return res.json([]); // Empty array in test mode
//   }

//   const docs = await alertsCollection.find({ patientId: id }).sort({ ts: -1 }).toArray();
//   res.json(docs);
// });

// // --- Start server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log(`API listening on ${PORT}`));
