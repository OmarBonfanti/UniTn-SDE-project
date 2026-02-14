// Index file for Adapter Service: Geocoding, Reverse Geocoding, Autocomplete, Email Sending
const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

// Configure EMAIL (Make sure ENV variables are passed from Docker)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "tuaemail@gmail.com",
    pass: process.env.EMAIL_PASS || "tuapassword",
  },
});

// 1. GEOCODING (From address to coordinates)
app.get("/geocode", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.json(null);

    // LOG: Request in geo-coding
    console.log(`🌍 Geocoding request received for: "${address}"`);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "MedicalApp/1.0" },
    });

    if (response.data.length > 0) {
      console.log(
        `✅ Coordinates found: Lat ${response.data[0].lat}, Lng ${response.data[0].lon}`,
      );
      res.json({ lat: response.data[0].lat, lng: response.data[0].lon });
    } else {
      console.log(`⚠️ No coordinates found for address.`);
      res.json(null);
    }
  } catch (e) {
    console.error("❌ Geocoding Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// 2. REVERSE GEOCODING (From coordinates to address)
app.get("/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    // LOG: Request reverse geo-coding
    console.log(`📍 Reverse Geocoding request: [${lat}, ${lng}]`);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "MedicalApp/1.0" },
    });

    const address = response.data.display_name || "Unknown address";
    console.log(`🏠 Address resolved: "${address.substring(0, 40)}..."`); // Cut for clear logs
    res.json({ address });
  } catch (e) {
    console.error("❌ Reverse Geo Error:", e.message);
    res.status(500).json({ error: "Reverse Geo Error" });
  }
});

// 3. AUTOCOMPLETE
app.get("/autocomplete", async (req, res) => {
  try {
    const query = req.query.text;
    if (!query || query.length < 3) return res.json([]);

    // LOG: Searching autocomplete suggestions
    console.log(`⌨️  Autocomplete External API call for: "${query}"`);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=it`;
    const response = await axios.get(url, {
      headers: { "User-Agent": "MedicalApp/1.0", "Accept-Language": "en" },
    });

    const suggestions = response.data.map((item) => {
      const addr = item.address;
      return [addr.road, addr.city || addr.town, addr.state]
        .filter((x) => x)
        .join(", ");
    });

    const uniqueSuggestions = [...new Set(suggestions)];
    console.log(
      `✨ Returned ${uniqueSuggestions.length} suggestions to Gateway.`,
    );

    res.json(uniqueSuggestions);
  } catch (e) {
    console.error("❌ Autocomplete Error:", e.message);
    res.json([]);
  }
});

// 4. VALIDATE CODICE FISCALE
app.get("/validate-cf", async (req, res) => {
  try {
    const { cf } = req.query;
    console.log(`🆔 Validating Fiscal Code via Cloudflare: ${cf}`);

    // The Adapter speak with an external service to validate the codice fiscale
    const url = `https://medical-check-cf.omarbonf.workers.dev?cf=${cf}`;

    const response = await axios.get(url);

    if (response.data.valid) {
      console.log(`✅ CF Validated Successfully`);
    } else {
      console.log(`⚠️ CF Invalid: ${response.data.error || "Unknown error"}`);
    }

    res.json(response.data); // Return { valid: true/false }
  } catch (error) {
    console.error("❌ CF Check Error:", error.message);
    res.json({ valid: false, error: "External service error" });
  }
});

// 5. SEND EMAIL
app.post("/email/send", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    // LOG: Email sending request
    console.log(`📨 SMTP: Sending email to [${to}] | Subject: "${subject}"`);

    await transporter.sendMail({
      from: "Medical App",
      to,
      subject,
      text,
      html,
    });

    console.log(`📤 Email sent successfully to ${to}!`);
    res.json({ success: true });
  } catch (e) {
    console.error("❌ Mail Failed:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// START SERVER ON PORT 3002 (Standard Adapter Port)
const PORT = 3002;
app.listen(PORT, () =>
  console.log(`🌍 Adapter Service running on port ${PORT}`),
);
