//Index file for Business Service: Slot Filtering and OTP Generation
const express = require("express");
const cors = require("cors");
const app = express();

// EXPAND LIMIT TO 50MB ---
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
// ----------------------------------------------------

// Mathematical function for distance calculation
function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * (Math.PI / 180);
  var dLon = (lon2 - lon1) * (Math.PI / 180);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// FILTER Slots by Radius
app.post("/filter", (req, res) => {
  try {
    const { slots, userLat, userLng, radius } = req.body;

    if (!slots || !Array.isArray(slots)) {
      return res.json([]);
    }

    const rKm = parseInt(radius) || 50;

    const filtered = slots
      .map((slot) => {
        const dist = getDistance(userLat, userLng, slot.lat, slot.lng);
        return { ...slot, distance: dist };
      })
      .filter((slot) => slot.distance <= rKm);

    console.log(
      `🧠 Business: Filter ${slots.length} -> remaining ${filtered.length}`,
    );

    res.json(filtered);
  } catch (error) {
    console.error("Business Filter Error:", error.message);
    res.status(500).json({ error: "Filter Error" });
  }
});

// Generate OTP
app.post("/otp/generate", (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  res.json({ code });
});

app.listen(3003, () => console.log("🧠 Business Service running on 3003"));
