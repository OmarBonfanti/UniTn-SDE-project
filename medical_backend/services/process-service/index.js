const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Config URLs
const DATA_URL = "http://data-service:3001";
const ADAPTER_URL = "http://adapter-service:3002";
const BUSINESS_URL = "http://business-service:3003";

// HELPER: Date formatter
const toSqlDate = (str) => {
  if (!str) return new Date().toISOString().slice(0, 19).replace("T", " ");
  if (str.includes("T")) return str.slice(0, 19).replace("T", " ");
  const [datePart, timePart] = str.split(" ");
  if (!datePart || !timePart) return str;
  const [day, month, year] = datePart.split("-");
  return `${year}-${month}-${day} ${timePart}:00`;
};

// AUTOCOMPLETE
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
    const response = await axios.get(`${ADAPTER_URL}/reverse`, {
      params: { lat, lng },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Gateway Error Reverse" });
  }
});

// COMPLEX SEARCH
app.post("/api/search", async (req, res) => {
  try {
    const { address, radius, dateStart, dateEnd } = req.body;
    console.log("🚦 PROCESS: Search request...");

    // A. Coordinates
    let userLoc = { lat: 46.0697, lng: 11.1211 };
    if (address) {
      try {
        const geoRes = await axios.get(`${ADAPTER_URL}/geocode`, {
          params: { address },
        });
        if (geoRes.data) userLoc = geoRes.data;
      } catch (e) {
        console.warn("Geo fallito, uso default");
      }
    }

    // B. Slots from DB
    const sqlStart = toSqlDate(dateStart);
    const sqlEnd = toSqlDate(dateEnd);
    const dataRes = await axios.get(`${DATA_URL}/slots`, {
      params: { start: sqlStart, end: sqlEnd },
    });

    // C. Distance Filter
    const businessRes = await axios.post(`${BUSINESS_URL}/filter`, {
      slots: dataRes.data,
      userLat: userLoc.lat,
      userLng: userLoc.lng,
      radius: radius,
    });

    res.json({
      success: true,
      userLocation: userLoc,
      results: businessRes.data,
    });
  } catch (error) {
    console.error("❌ Gateway Search Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SEND OTP
app.post("/api/otp/send", async (req, res) => {
  try {
    const { email } = req.body;

    // A. Generate Code (Business Service)
    const otpRes = await axios.post(`${BUSINESS_URL}/otp/generate`);
    const code = otpRes.data.code;

    // B. Send Email (Adapter Service)
    // Note: Make sure the email is valid or use a fake one
    try {
      await axios.post(`${ADAPTER_URL}/email/send`, {
        to: email,
        subject: "Your OTP Code",
        text: `Your code is: ${code}`,
        html: `<h1>Your code is: ${code}</h1>`,
      });
    } catch (e) {
      console.warn(
        "⚠️ Unable to send real email (Adapter Error). Continuing anyway for testing.",
      );
    }

    // C. Save in memory (Simplified for the project)
    global.otpStore = global.otpStore || {};
    global.otpStore[email] = code;
    console.log(`🔑 OTP generated for ${email}: ${code}`); // Printing so you can copy it for testing

    res.json({ success: true });
  } catch (error) {
    console.error("Gateway OTP Error:", error.message);
    res.status(500).json({ success: false });
  }
});

// VERIFY OTP
app.post("/api/otp/verify", (req, res) => {
  const { email, code } = req.body;
  const storedCode = global.otpStore ? global.otpStore[email] : null;

  // Accept the real code OR the magic code "123456" for quick tests
  if (code === "123456" || code === storedCode) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// 6. BOOKING
app.post("/api/book", async (req, res) => {
  try {
    const { slot_id, user_email } = req.body;

    const bookRes = await axios.patch(`${DATA_URL}/slots/${slot_id}/book`);
    if (!bookRes.data.success)
      return res.json({ success: false, message: "Slot occupied" });

    // Confirmation Email (Adapter)
    try {
      await axios.post(`${ADAPTER_URL}/email/send`, {
        to: user_email,
        subject: "Booking Confirmed ✅",
        text: "We are waiting for you!",
        html: "<h1>Confirmed!</h1>",
      });
    } catch (e) {
      console.warn("No email sent");
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Book Error:", error.message);
    res.status(500).json({ success: false });
  }
});

app.listen(3000, () =>
  console.log("🚦 Process Service (Gateway) running on 3000"),
);
