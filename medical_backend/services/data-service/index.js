//Index file for Data Service: Slot Searching and Booking
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Configure DB
const db = mysql.createPool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "medical_db",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

// Test connection
db.getConnection((err, connection) => {
  if (err) console.error("❌ DB Connection Error:", err.code);
  else {
    console.log("💾 DATA SERVICE: Connected to MySQL");
    connection.release();
  }
});

// 1. SEARCH SLOTS (Correct logic: Filter ONLY on date_start)
app.get("/slots", (req, res) => {
  // start and end are the interval chosen by the user (e.g. "I want visits from Feb 1 to Feb 10")
  const { start, end } = req.query;

  const query = `
        SELECT 
            s.id, s.date_start, s.status,
            d.name as doctor_name, 
            c.id as id_clinic, c.name as clinic_name, c.address, c.city, c.lat, c.lng
        FROM slots s
        JOIN doctors d ON s.doctor_id = d.id
        JOIN clinics c ON d.clinic_id = c.id
        WHERE s.status = 'free' 
        AND s.date_start >= ? 
        AND s.date_start <= ? 
    `;

  db.query(query, [start, end], (err, results) => {
    if (err) {
      console.error("Query Search Error:", err);
      return res.status(500).json({ error: err.message });
    }

    // Optional: Calculate a fake end date (+30 min) for the frontend
    // so the map or list don't break if they expect that field
    const resultsWithEnd = results.map((slot) => {
      const startDate = new Date(slot.date_start);
      const endDate = new Date(startDate.getTime() + 30 * 60000); // +30 minuti
      return {
        ...slot,
        date_end: endDate.toISOString().slice(0, 19).replace("T", " "),
      };
    });

    res.json(resultsWithEnd);
  });
});

// BOOK A SLOT
app.patch("/slots/:id/book", (req, res) => {
  const slotId = req.params.id;

  // Check availability
  db.query(
    "SELECT status FROM slots WHERE id = ?",
    [slotId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Slot not found" });
      if (results[0].status !== "free")
        return res.json({ success: false, message: "Already booked" });

      // Book the slot
      db.query(
        "UPDATE slots SET status = 'booked' WHERE id = ?",
        [slotId],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        },
      );
    },
  );
});

// 3. SLOT DETAILS (For emails)
app.get("/slots/:id", (req, res) => {
  const slotId = req.params.id;
  const query = `
        SELECT s.date_start, c.name as clinic, c.address, d.name as doctor
        FROM slots s
        JOIN doctors d ON s.doctor_id = d.id
        JOIN clinics c ON d.clinic_id = c.id
        WHERE s.id = ?
    `;

  db.query(query, [slotId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({});
    res.json(results[0]);
  });
});

app.listen(3001, () => console.log("💾 Data Service running on 3001"));
