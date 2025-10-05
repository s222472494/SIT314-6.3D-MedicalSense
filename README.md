# MedicalSense IoT Dashboard

An IoT-based healthcare monitoring system that collects, processes, and visualises patient vital signs in real time. The system demonstrates scalability by supporting multiple patients, storing data in MongoDB, and providing a web dashboard via Node-RED.

---

## 📌 Features

* **Multi-Patient Monitoring** – Supports multiple patients sending simulated vitals.
* **Sensor Data Simulation** – Generates realistic values for:

  * Heart Rate
  * Oxygen Saturation (SpO₂)
  * Body Temperature (°C)
  * Air Quality Index
* **Scalable Backend** – Node.js server with MongoDB Atlas for storage.
* **Real-Time Dashboard** – Node-RED dashboard with gauges.
* **Alert System** – Detects abnormal vitals and displays alerts with patient ID.

---

## 🏗️ Project Architecture

```
Simulator.js → Node.js Server → MongoDB Atlas → Node-RED → Dashboard (Gauges + Alerts)
```

---

## 📊 Dashboard Usage

* Open Node-RED dashboard: `http://localhost:1880/ui`.
* Gauges display the latest vitals.
* Alerts appear if thresholds are breached.

---

## 🚨 Alert Thresholds

| Vital Sign        | Low Alert  | High Alert  |
| ----------------- | ---------- | ----------- |
| Heart Rate        | `< 50 bpm` | `> 110 bpm` |
| Oxygen Saturation | `< 90 %`   | –           |
| Temperature       | `< 35 °C`  | `> 38 °C`   |
| Air Quality       | –          | `> 100 AQI` |

---

## 📂 Repository Structure

```
/medicalsense-iot
  |── simulator │── simulator.js # Patient vitals simulator
  |── api │── server.js # Node.js server + MongoDB
          |── .env # Stores the connection string and any other private credentials
│── README.md # Project documentation
│── package.json
```
---

## 👤 Author

**Kylen Shailen s222472494**
SIT314 – Software Architecture and Scalability of IoT
Deakin University
