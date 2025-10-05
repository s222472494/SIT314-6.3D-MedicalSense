const axios = require('axios');
const ENDPOINT = 'http://localhost:1880/sensor';
const patients = ['patient_001','patient_002','patient_003'];

function rand(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }

async function send(p){
  const payload = {
    patientId: p,
    ts: new Date().toISOString(),
    heartRate: rand(58,95),
    spo2: rand(93,99),
    tempC: Number((36 + Math.random()).toFixed(2)),
    airQuality: rand(45,110)
  };
  // rare anomaly injection
  if (Math.random() < 0.03) payload.heartRate = rand(130,160);
  try {
    await axios.post(ENDPOINT, payload);
    console.log('sent', p, payload.heartRate, payload.spo2, payload.tempC);
  } catch (e) {
    console.error('send err', e.message);
  }
}

setInterval(() => {
  patients.forEach(p => send(p));
}, 5000);
