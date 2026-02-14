// Index file for Business Service: Slot Filtering and OTP Generation
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

// EXPAND LIMIT TO 50MB (Crucial for receiving large slot lists from Data Service)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Mathematical function for distance calculation (Haversine Formula)
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;

  var R = 6371; // Radius of the earth in km
  var dLat = (lat2 - lat1) * (Math.PI / 180);
  var dLon = (lon2 - lon1) * (Math.PI / 180);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// 1. FILTER SLOTS BY RADIUS
app.post("/filter", (req, res) => {
  try {
    const { slots, userLat, userLng, radius } = req.body;

    console.log(
      `🧠 Analysis Request: Processing ${slots ? slots.length : 0} slots...`,
    );

    if (!slots || !Array.isArray(slots)) {
      console.log(`⚠️ No slots provided to filter.`);
      return res.json([]);
    }

    const rKm = parseInt(radius) || 50;
    console.log(
      `📏 Applying Rule: Distance < ${rKm} km from [${userLat}, ${userLng}]`,
    );

    const filtered = slots
      .map((slot) => {
        const dist = getDistance(userLat, userLng, slot.lat, slot.lng);
        return { ...slot, distance: parseFloat(dist.toFixed(2)) };
      })
      .filter((slot) => {
        return slot.distance <= rKm;
      })
      .sort((a, b) => a.distance - b.distance); // Order by proximity

    res.json(filtered);
  } catch (error) {
    console.error("❌ Filter Error:", error.message);
    res.status(500).json({ error: "Filter Logic Failed" });
  }
});

// 2. GENERATE OTP (One Time Password)
app.post("/otp/generate", (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔐 Security: Generated OTP [${code}] for transaction.`);
  res.json({ code });
});

// START SERVER
const PORT = 3003;
app.listen(PORT, () =>
  console.log(`🧠 Business Service running on port ${PORT}`),
);
