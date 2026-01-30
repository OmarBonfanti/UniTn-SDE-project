const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

const path = require("path");
const dotenv = require("dotenv");

// Force read .ENV (Force load from project root)
// __dirname = folder src. '../.env' = project folder.
const result = dotenv.config({ path: path.resolve(__dirname, "../.env") });

// DB Configuration
// should match your Docker setup
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "medical_db",
  port: process.env.DB_PORT || 3306,
};

// Distance Helper Function (to be placed outside the route, or at the end of the file)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Earth radius in km
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
const nodemailer = require("nodemailer");

// GMAIL CONFIGURATION
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// OTP Memory
const otpStore = {};

let db;

// Function to connect to the database
async function connectToDb() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to the Database!");
  } catch (err) {
    console.error("❌ Unable to connect to the DB:", err.message);
  }
}

// Starting the connection
connectToDb();

// SPECIAL FUNCTION: Connects and creates tables by itself
async function startServer() {
  try {
    // 1. Connect to the DB
    const connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to the Docker Database!");

    // Start Web Server
    // SEARCH ROUTE (Server.js)
    // SEARCH ROUTE (With Correct Date Filter)
    app.post("/api/search", async (req, res) => {
      try {
        // 1. Receive data from Frontend
        const { address, radius, dateStart, dateEnd } = req.body;

        console.log("🔍 Search:", { address, dateStart, dateEnd });

        // 2. Geocoding (Find user coordinates)
        // Default Trento
        let userLat = 46.04;
        let userLng = 11.07;

        if (address) {
          try {
            const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            const geoRes = await axios.get(geoUrl, {
              headers: { "User-Agent": "MedicalBookingServer/1.0" },
            });
            if (geoRes.data.length > 0) {
              userLat = parseFloat(geoRes.data[0].lat);
              userLng = parseFloat(geoRes.data[0].lon);
            }
          } catch (e) {
            console.warn("⚠️ Geocoding fallito, uso default");
          }
        }

        // 3. Converte date from "DD-MM-YYYY HH:MM" to "YYYY-MM-DD HH:MM:SS"
        // Internal function
        const toSqlDate = (str) => {
          if (!str)
            return new Date().toISOString().slice(0, 19).replace("T", " "); // Fallback NOW
          const [datePart, timePart] = str.split(" ");
          const [day, month, year] = datePart.split("-");
          return `${year}-${month}-${day} ${timePart}:00`;
        };

        const sqlStart = toSqlDate(dateStart);
        const sqlEnd = toSqlDate(dateEnd);

        console.log(`📅 DB Filter from: ${sqlStart} to: ${sqlEnd}`);

        // 4. UPDATED SQL QUERY
        // Use ? (placeholder) to safely insert dates
        const querySql = `
            SELECT 
                s.id, 
                s.date_start, 
                s.status,
                d.name AS doctor_name, 
                d.surname AS doctor_surname, 
                c.id AS id_clinic,
                c.name, 
                c.address, 
                c.city, 
                c.lat, 
                c.lng
            FROM slots s
            JOIN doctors d ON s.doctor_id = d.id
            JOIN clinics c ON d.clinic_id = c.id
            WHERE s.status = 'free' 
            AND s.date_start >= ?   -- Start Date (Greater or equal)
            AND s.date_start <= ?   -- End Date (Less or equal)
        `;

        // ... (after SQL query) ...
        const [rows] = await db.query(querySql, [sqlStart, sqlEnd]);

        // DEFAULT RADIUS
        const radiusKm = parseInt(radius) || 50;
        console.log(`[Filter] Radius requested: ${radiusKm} km`);

        // Set to keep track of clinics already logged in this round
        const loggedClinics = new Set();
        let keptCount = 0;
        let droppedCount = 0;

        const results = rows
          .map((row) => {
            const dist = getDistanceFromLatLonInKm(
              userLat,
              userLng,
              row.lat,
              row.lng,
            );
            return { ...row, distance: dist };
          })
          .filter((item) => {
            const isInside = item.distance <= radiusKm;

            // --- LOGGING for check clinics in radius ---
            if (!loggedClinics.has(item.name)) {
              loggedClinics.add(item.name);
              if (isInside) {
                console.log(
                  `   ✅ KEEP CLINIC: ${item.name} (${item.city}) - Dist: ${item.distance.toFixed(1)} km`,
                );
              } else {
                console.log(
                  `   ❌ DROP CLINIC: ${item.name} (${item.city}) - Dist: ${item.distance.toFixed(1)} km > ${radiusKm} km`,
                );
              }
            }

            // Totals for final summary
            if (isInside) keptCount++;
            else droppedCount++;

            // REAL FILTERS
            if (!isInside) return false;

            return true;
          });

        console.log(
          `[API] Summary: Kept ${keptCount} slots, Dropped ${droppedCount} slots.`,
        );
        console.log(
          `[API] Final Response: Sending ${results.length} slots to Frontend.`,
        );

        res.json({
          success: true,
          userLocation: { lat: userLat, lng: userLng },
          results: results,
        });
      } catch (error) {
        console.error("❌ Errore API Search:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Autocomplete Route
    // Frontend call: /api/autocomplete?text=Milano
    app.get("/api/autocomplete", async (req, res) => {
      try {
        const query = req.query.text;
        console.log("Research Autocomplete:", query);

        if (!query || query.length < 3) {
          return res.json([]);
        }

        // Use axios to call OpenStreetMap Nominatim API
        // addressdetails=1: gives details to build the string
        // limit=5: maximum 5 results
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=it`;

        // IMPORTANT: Nominatim requires a User-Agent, otherwise it returns error 403 or 400!
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "MedicalBookingServer/1.0",
            "Accept-Language": "en,it", // We look for results in English and Italian
          },
        });

        // Format data for the frontend
        const suggestions = response.data.map((item) => {
          const addr = item.address;
          // Build a readable string: Street, City, Province
          const street = addr.road || addr.pedestrian || addr.suburb || "";
          const city =
            addr.city || addr.town || addr.village || addr.municipality || "";
          const prov = addr.state || "";

          // Join the existing parts
          return [street, city, prov].filter((x) => x).join(", ");
        });

        // Remove duplicates (Nominatim sometimes returns duplicates)
        const uniqueSuggestions = [...new Set(suggestions)];
        res.json(uniqueSuggestions);
      } catch (error) {
        console.error("Autocomplete Error:", error.message);
        // If it fails, return an empty array instead of breaking everything
        res.json([]);
      }
    });

    // REVERSE GEOCODING ROUTE: From Coordinates to Address
    app.get("/api/reverse", async (req, res) => {
      try {
        const { lat, lng } = req.query;

        // Call OpenStreetMap from the Server (safer)
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

        const response = await axios.get(url, {
          headers: { "User-Agent": "MedicalBookingServer/1.0" },
        });

        // Return only the readable name
        res.json({ address: response.data.display_name });
      } catch (error) {
        console.error("Reverse Geo Error:", error.message);
        res.status(500).json({ error: "Error retrieving address" });
      }
    });

    // MAIL SENDING ROUTE
    app.post("/api/otp/send", async (req, res) => {
      try {
        const { email } = req.body;

        // Generate code OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = code;

        console.log(`⏳ Sending mail to ${email} with Gmail...`);

        // Send Real Mail
        await transporter.sendMail({
          from: `"Medical Bookings" <${process.env.EMAIL_USER}>`, // Must be your email
          to: email,
          subject: "OTP Code for Your Booking",
          text: `Your OTP code is: ${code}`,
          html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #333;">Confirm Your Booking</h2>
                    <p>Use the following code to complete the process:</p>
                    <h1 style="color: #d32f2f; font-size: 32px; letter-spacing: 2px;">${code}</h1>
                    <p style="color: #777; font-size: 12px;">If you did not request this code, please ignore this email.</p>
                </div>
            `,
        });

        console.log(`✅ Mail sent successfully to ${email}!`);
        res.json({ success: true, message: "Email sent" });
      } catch (error) {
        console.error("❌ Gmail Error:", error);
        res.status(500).json({ success: false, error: "Email sending error" });
      }
    });

    // CONFIRM BOOKING (DB + SUMMARY MAIL)
    app.post("/api/book", async (req, res) => {
      try {
        const { slot_id, user_email } = req.body;
        console.log(`📝 Attempting to book Slot ${slot_id} for ${user_email}`);

        // 1. CHECK: Is the slot still free?
        const [check] = await db.query(
          'SELECT * FROM slots WHERE id = ? AND status = "free"',
          [slot_id],
        );

        if (check.length === 0) {
          return res.json({
            success: false,
            message: "Slot already booked or does not exist",
          });
        }

        // 2. UPDATE: Mark the slot as booked
        await db.query('UPDATE slots SET status = "booked" WHERE id = ?', [
          slot_id,
        ]);
        console.log("✅ Database updated: Slot booked.");

        // 3. RETRIEVE DETAILS (For the confirmation email)
        // We do a JOIN to have readable names to send via email
        const queryDettagli = `
            SELECT 
                s.date_start, 
                d.name AS doc_name, d.surname AS doc_surname, 
                c.name AS clinic_name, c.address, c.city
            FROM slots s
            JOIN doctors d ON s.doctor_id = d.id
            JOIN clinics c ON d.clinic_id = c.id
            WHERE s.id = ?
        `;
        const [rows] = await db.query(queryDettagli, [slot_id]);
        const info = rows[0];

        // Format the date (e.g., "Lunedì 24 Gennaio 2026")
        const dateReadable = new Date(info.date_start).toLocaleString("en-US", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const timeReadable = new Date(info.date_start).toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // 4. SEND SUMMARY EMAIL (Professional HTML Template)
        console.log(`📧 Sending summary email to: ${user_email}...`);

        await transporter.sendMail({
          from: '"Prenotazioni Sanitarie" <' + process.env.EMAIL_USER + ">", // Use your email config in .env
          to: user_email,
          subject: `Appointment Confirmation: ${dateReadable} ✅`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
                    .header { background-color: #1976D2; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .details-box { background-color: #f9f9f9; border-left: 4px solid #1976D2; padding: 15px; margin: 20px 0; }
                    .detail-item { margin-bottom: 10px; }
                    .label { font-weight: bold; color: #555; }
                    .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Prenotazione Confermata</h1>
                    </div>
                    <div class="content">
                        <p>Gentile Utente,</p>
                        <p>Siamo lieti di confermare il tuo appuntamento. Ecco il riepilogo dei dettagli:</p>
                        
                        <div class="details-box">
                            <div class="detail-item"><span class="label">📅 Date:</span> ${dateReadable}</div>
                            <div class="detail-item"><span class="label">⏰ Time:</span> ${timeReadable}</div>
                            <div class="detail-item"><span class="label">👨‍⚕️ Doctor:</span> Dr. ${info.doc_name} ${info.doc_surname} (${info.specialty})</div>
                            <div class="detail-item"><span class="label">🏥 Clinic:</span> ${info.clinic_name}</div>
                            <div class="detail-item"><span class="label">📍 Address:</span> ${info.address}, ${info.city}</div>
                        </div>

                        <p>Please arrive 10 minutes early.</p>
                        <p>Best regards,<br>The Booking Team</p>
                    </div>
                    <div class="footer">
                        This is an automated email generated by the AdDhOC & Cute system.<br>
                        Do not reply to this email.
                    </div>
                </div>
            </body>
            </html>
            `,
        });

        console.log("📧 Mail sent successfully!");
        res.json({ success: true });
      } catch (error) {
        console.error("❌ Booking error:", error);
        // Even if the mail fails, if the DB is updated we give success but log the error
        res
          .status(500)
          .json({ success: false, error: "Errore interno server" });
      }
    });

    // OTP MAIL VERIFICATION ROUTE
    app.post("/api/otp/verify", (req, res) => {
      const { email, code } = req.body;
      // We accept the real code OR the wildcard 123456 for convenience
      if (code === otpStore[email] || code === "123456") {
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    });

    // Start the server
    app.listen(3000, () => {
      console.log("🚀 Server Backend ready at http://localhost:3000");
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("Make sure Docker is running!");
  }
}

startServer();
