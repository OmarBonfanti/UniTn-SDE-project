// Index file for Data Service: Slot Searching and Booking
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
    console.log("💾 MySQL Database Connected Successfully");
    connection.release();
  }
});

// 1. SEARCH SLOTS
app.get("/slots", (req, res) => {
  const { start, end } = req.query;

  // LOG: Querying slots with provided parameters
  console.log(`🔍 Querying Slots between [${start}] and [${end}]...`);

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
      console.error("❌ Query Error:", err.message);
      return res.status(500).json({ error: err.message });
    }

    // LOG: Query results count
    console.log(`✅ Found ${results.length} available slots in DB.`);

    // Calculate a fake end date (+30 min) for frontend compatibility
    const resultsWithEnd = results.map((slot) => {
      const startDate = new Date(slot.date_start);
      const endDate = new Date(startDate.getTime() + 30 * 60000); // +30 mins
      return {
        ...slot,
        date_end: endDate.toISOString().slice(0, 19).replace("T", " "),
      };
    });

    res.json(resultsWithEnd);
  });
});

// 2. BOOK A SLOT
app.patch("/slots/:id/book", (req, res) => {
  const slotId = req.params.id;

  // LOG: Booking attempt for slot
  console.log(`📝 Attempting to book Slot ID: ${slotId}`);

  // Check availability
  db.query(
    "SELECT status FROM slots WHERE id = ?",
    [slotId],
    (err, results) => {
      if (err) {
        console.error("❌ SQL Error checking status:", err);
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        console.log(`⚠️ Slot ${slotId} not found.`);
        return res
          .status(404)
          .json({ success: false, message: "Slot not found" });
      }

      if (results[0].status !== "free") {
        console.log(
          `⛔ Booking Failed: Slot ${slotId} is already ${results[0].status}`,
        );
        return res.json({ success: false, message: "Already booked" });
      }

      // Execute Booking Update
      db.query(
        "UPDATE slots SET status = 'booked' WHERE id = ?",
        [slotId],
        (updateErr, result) => {
          if (updateErr) {
            console.error("❌ Update Error:", updateErr);
            return res.status(500).json({ error: updateErr.message });
          }
          console.log(`🎉 Slot ${slotId} successfully marked as BOOKED.`);
          res.json({ success: true });
        },
      );
    },
  );
});

// 3. SLOT DETAILS (For email notifications)
app.get("/slots/:id", (req, res) => {
  const slotId = req.params.id;

  // LOG: Fetching details for mail notification
  console.log(`ℹ️  Fetching details for Slot ID: ${slotId}`);

  const query = `
        SELECT s.date_start, c.name as clinic, c.address, d.name as doctor
        FROM slots s
        JOIN doctors d ON s.doctor_id = d.id
        JOIN clinics c ON d.clinic_id = c.id
        WHERE s.id = ?
    `;

  db.query(query, [slotId], (err, results) => {
    if (err) {
      console.error("❌ Detail Query Error:", err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) return res.status(404).json({});

    res.json(results[0]);
  });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`💾 Data Service running on ${PORT}`));
