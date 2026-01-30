const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "medical_db",
};

async function seed() {
  let connection;
  try {
    console.log("🌱 Connection to the database...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connection SUCCESSFUL!");

    // TOTAL CLEANUP (Turn off checks to delete without errors)
    console.log("🧹 Deleting existing data...");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    await connection.query("TRUNCATE TABLE slots");
    await connection.query("TRUNCATE TABLE doctors");
    await connection.query("TRUNCATE TABLE clinics");
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    // CLINICS (Inserting IDs manually!)
    console.log("🏥 Inserting Clinics (with forced IDs)...");
    // Note: Added 'id' in the insert
    await connection.query(`
            INSERT INTO clinics (id, name, address, city, lat, lng) VALUES 
            (1, 'Centro Salute Trento', 'Via S. Pietro 12', 'Trento', 46.0697, 11.1211),
            (2, 'Poliambulatorio Povo', 'Via della Salita 5', 'Povo', 46.0664, 11.1533),
            (3, 'Studio Rovereto Nord', 'Corso Rosmini 4', 'Rovereto', 45.8906, 11.0401),
            (4, 'Medical Center Milan', 'Piazza Duomo 1', 'Milano', 45.4642, 9.1900),
            
            (5, 'Centro Medico Alto Garda', 'Via Capitelli 18', 'Arco', 45.9178, 10.8872),
            (6, 'Ambulatorio Rotaliana', 'Corso del Popolo 33', 'Mezzolombardo', 46.2148, 11.0955),
            (7, 'Poliambulatorio Valsugana', 'Viale Venezia 4', 'Pergine Valsugana', 46.0619, 11.2369),
            (8, 'Dolomiti Medical Center', 'Via Dossi 2', 'Cavalese', 46.2911, 11.4594),

            (9, 'BOMA Poliambulatori', 'Viale Druso 41', 'Bolzano', 46.4952, 11.3343),
            (10, 'Martinsbrunn ParkClinic', 'Via Laurino 70', 'Merano', 46.6821, 11.1458),
            (11, 'Centro Medico Brunico', 'Via Teodone 15', 'Brunico', 46.7984, 11.9432),
            (12, 'Ambulatorio Bressanone', 'Via Ponte Aquila 7', 'Bressanone', 46.7155, 11.6567)
        `);

    // DOCTORS (Inserting IDs manually!)
    console.log("👨‍⚕️ Inserting Doctors (with forced IDs)...");
    // Note: Added 'id' in the insert to ensure the slot loop works
    await connection.query(`
            INSERT INTO doctors (id, name, surname, clinic_id) VALUES 
            (1, 'Mario', 'Rossi', 1),
            (2, 'Laura', 'Bianchi', 1),
            (3, 'Paolo', 'Verdi', 2),
            (4, 'Giulia', 'Neri', 3),
            (5, 'Marco', 'Gialli', 4),

            (6, 'Roberto', 'Costa', 5),
            (7, 'Elena', 'Rizzo', 5),
            (8, 'Anna', 'Ferrari', 6),
            (9, 'Luigi', 'Esposito', 6),
            (10, 'Sofia', 'Romano', 6),
            (11, 'Giorgio', 'Colombo', 7),
            (12, 'Martina', 'Ricci', 7),
            (13, 'Alessandro', 'Marino', 8),
            (14, 'Chiara', 'Greco', 8),
            (15, 'Davide', 'Bruno', 8),

            (16, 'Manuela', 'Busato', 9),
            (17, 'Luca', 'Chirizzi', 9),
            (18, 'Sara', 'Bertagnolli', 9),
            (19, 'Relja', 'Stankovic', 10),
            (20, 'Sara', 'Auer', 10),
            (21, 'Christine', 'Arquin', 10),
            (22, 'Andreas', 'Felder', 11),
            (23, 'Michaela', 'Jesacher', 11),
            (24, 'Simon', 'Seehauser', 12),
            (25, 'Marina', 'Patic', 12)
        `);

    // SLOT GENERATION
    console.log("📅 Generating future appointments...");

    // Now we are SURE that doctor IDs go from 1 to 25 because we wrote them ourselves
    const doctorsCount = 25;
    const slots = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const dateStr = currentDate.toISOString().split("T")[0];

      for (let docId = 1; docId <= doctorsCount; docId++) {
        const hours = [
          "09:00:00",
          "10:00:00",
          "11:00:00",
          "14:30:00",
          "16:00:00",
        ];
        hours.forEach((time) => {
          const status = Math.random() > 0.8 ? "booked" : "free";
          slots.push([`${dateStr} ${time}`, status, docId]);
        });
      }
    }

    if (slots.length > 0) {
      const sql = "INSERT INTO slots (date_start, status, doctor_id) VALUES ?";
      await connection.query(sql, [slots]);
      console.log(`✅ Inserted ${slots.length} slots.`);
    }

    console.log("🎉 DB successfully regenerated! No Foreign Key errors.");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
