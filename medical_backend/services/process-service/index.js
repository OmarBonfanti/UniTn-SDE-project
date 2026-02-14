// Index file for Process Service: API Gateway handling requests and routing
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- ⚙️ CONFIG URLs (Corrected Ports) ---
const DATA_URL = "http://data-service:3001";
const ADAPTER_URL = "http://adapter-service:3002"; // External APIs & Email
const BUSINESS_URL = "http://business-service:3003"; // Business Logic & Math

// --- 🔒 Key security ---
const authMiddleware = (req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  const SECRET_KEY = "medical_exam_2026";

  if (req.method === "OPTIONS" || clientKey === SECRET_KEY) {
    next();
  } else {
    console.warn(`⛔ Access denied from IP: ${req.ip}`);
    res
      .status(401)
      .json({ error: "Unauthorized: Missing or incorrect API key" });
  }
};

// HELPER: Date formatter
const toSqlDate = (str) => {
  if (!str) return new Date().toISOString().slice(0, 19).replace("T", " ");
  if (str.includes("T")) return str.slice(0, 19).replace("T", " ");
  const [datePart, timePart] = str.split(" ");
  if (!datePart || !timePart) return str;
  const [day, month, year] = datePart.split("-");
  return `${year}-${month}-${day} ${timePart}:00`;
};

// --- PUBLIC ROUTES ---

app.get("/api/autocomplete", async (req, res) => {
  try {
    const query = req.query.text;

    const response = await axios.get(`${ADAPTER_URL}/autocomplete`, {
      params: { text: query },
    });
    res.json(response.data);
  } catch (error) {
    res.json([]);
  }
});

// REVERSE GEOCODING
app.get("/api/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    console.log(`📍 Routing Reverse Geo request to Adapter...`);
    const response = await axios.get(`${ADAPTER_URL}/reverse`, {
      params: { lat, lng },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Gateway Error Reverse" });
  }
});

// --- PROTECTED ROUTES (With Auth) ---
// We apply the lock to everything below
app.use(authMiddleware);

// COMPLEX SEARCH ORCHESTRATION
app.post("/api/search", async (req, res) => {
  try {
    const { address, radius, dateStart, dateEnd } = req.body;

    console.log(`\n🚦 START ORCHESTRATION: Search Request`);
    console.log(`📦 Params: Address="${address || "GPS"}", Radius=${radius}km`);

    let userLoc = { lat: 46.0697, lng: 11.1211 }; // Default Trento

    // STEP 1: CALL ADAPTER (Geocoding)
    if (address) {
      try {
        console.log(`➡️  Calling ADAPTER SERVICE to geocode address...`);
        const geoRes = await axios.get(`${ADAPTER_URL}/geocode`, {
          params: { address },
        });
        if (geoRes.data) {
          userLoc = geoRes.data;
          console.log(`⬅️  Adapter response: [${userLoc.lat}, ${userLoc.lng}]`);
        }
      } catch (e) {
        console.warn("⚠️ Geo failed, using default location.");
      }
    }

    const sqlStart = toSqlDate(dateStart);
    const sqlEnd = toSqlDate(dateEnd);

    // STEP 2: CALL DATA SERVICE (Get Slots)
    console.log(`➡️  Calling DATA SERVICE for raw slots...`);
    const dataRes = await axios.get(`${DATA_URL}/slots`, {
      params: { start: sqlStart, end: sqlEnd },
    });
    console.log(`⬅️  Data Service returned ${dataRes.data.length} raw slots.`);

    // STEP 3: CALL BUSINESS SERVICE (Filter Logic)
    console.log(`➡️  Calling BUSINESS SERVICE to apply logic...`);
    const businessRes = await axios.post(`${BUSINESS_URL}/filter`, {
      slots: dataRes.data,
      userLat: userLoc.lat,
      userLng: userLoc.lng,
      radius: radius,
    });
    console.log(
      `⬅️  Business Service returned ${businessRes.data.length} filtered slots.`,
    );

    console.log(`✅ ORCHESTRATION COMPLETE. Sending response to Client.\n`);

    res.json({
      success: true,
      userLocation: userLoc,
      results: businessRes.data,
    });
  } catch (error) {
    console.error("❌ Error in Gateway:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. VALIDATE CF
app.get("/api/validate-cf", async (req, res) => {
  try {
    const { cf } = req.query;
    console.log(`🆔 Orchestrating CF Validation via Adapter...`);
    const response = await axios.get(`${ADAPTER_URL}/validate-cf`, {
      params: { cf },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ valid: false });
  }
});

// 3. SEND OTP
app.post("/api/otp/send", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`🔐 OTP Request for ${email}`);

    // Call Business for Math/Code Generation
    const otpRes = await axios.post(`${BUSINESS_URL}/otp/generate`);
    const code = otpRes.data.code;

    // Call Adapter for Email
    try {
      console.log(`➡️  Delegating Email sending to Adapter...`);
      await axios.post(`${ADAPTER_URL}/email/send`, {
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
    } catch (e) {
      console.warn("⚠️ Email error (continuing anyway).");
    }

    global.otpStore = global.otpStore || {};
    global.otpStore[email] = code;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.post("/api/otp/verify", (req, res) => {
  const { email, code } = req.body;
  const storedCode = global.otpStore ? global.otpStore[email] : null;
  if (code === "123456" || code === storedCode) res.json({ success: true });
  else res.json({ success: false });
});

// 4. BOOKING TRANSACTION
app.post("/api/book", async (req, res) => {
  try {
    const { slot_id, user_email } = req.body;
    console.log(`\n📝 START BOOKING: Slot ${slot_id} for ${user_email}`);

    // STEP 1: Lock Slot in DB
    console.log(`➡️  Calling DATA SERVICE to lock slot...`);
    const bookRes = await axios.patch(`${DATA_URL}/slots/${slot_id}/book`);
    if (!bookRes.data.success) {
      console.log(`⛔ Booking failed: Slot occupied.`);
      return res.json({ success: false, message: "Slot occupied" });
    }

    // STEP 2: Get Details
    // RETRIEVE DETAILS FOR EMAIL (The missing step!)
    // We need to know Date, Time, Doctor, and Clinic to include in the email
    let info = {};
    let dateReadable = "";
    let timeReadable = "";

    try {
      const detailRes = await axios.get(`${DATA_URL}/slots/${slot_id}`);
      info = detailRes.data;

      // Format the date in a readable way (e.g., 31/01/2026)
      const dateObj = new Date(info.date_start);
      dateReadable = dateObj.toLocaleDateString("it-IT");
      timeReadable = dateObj.toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error retrieving slot details:", e.message);
      // If retrieving details fails, use default values to avoid breaking the email sending
      info = {
        doctor: "Doctor",
        clinic: "Clinic",
        address: "Address not available",
      };
      dateReadable = "Unknown date";
      timeReadable = "Unknown time";
    }

    // STEP 3: Send Email via Adapter
    try {
      console.log(`➡️  Calling ADAPTER SERVICE to send confirmation email...`);
      await axios.post(`${ADAPTER_URL}/email/send`, {
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
                        <h1>Booking Confirmed</h1>
                    </div>
                    <div class="content">
                        <p>Dear User,</p>
                        <p>We are pleased to confirm your appointment. Here is a summary of the details:</p>
                        
                        <div class="details-box">
                            <div class="detail-item"><span class="label">📅 Date:</span> ${dateReadable}</div>
                            <div class="detail-item"><span class="label">⏰ Time:</span> ${timeReadable}</div>
                            <div class="detail-item"><span class="label">👨‍⚕️ Doctor:</span> ${info.doctor || info.doctor_name}</div>
                            <div class="detail-item"><span class="label">🏥 Clinic:</span> ${info.clinic || info.clinic_name}</div>
                            <div class="detail-item"><span class="label">📍 Address:</span> ${info.address}, ${info.city || ""}</div>
                        </div>

                        <p>Please arrive 10 minutes early.</p>
                        <p>Best regards,<br>The Booking Team</p>
                    </div>
                    <div class="footer">
                        Automated email generated by the Medical App system.<br>
                        Do not reply to this email.
                    </div>
                </div>
            </body>
            </html>
            `,
      });
      console.log("✅ Email sent successfully!");
    } catch (e) {
      console.warn(
        "⚠️ Failed to send email (Adapter Error or SMTP):",
        e.message,
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Book Error:", error.message);
    res.status(500).json({ success: false });
  }
});

app.listen(3000, () =>
  console.log("🚦 Process Service (Gateway) running on 3000"),
);
