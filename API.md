# 🏥 Medical App – API Documentation

This documentation describes the endpoints exposed by the **Process Service (Gateway)** running on port **3000**.

---

## 🔐 Authentication and Security

The system divides the APIs into two security levels:

1. **Public API:** Freely accessible (to keep the UI fluid).
2. **Protected API:** Require a security header.

**Required header for protected routes:**

- Key: `x-api-key`
- Value: `medical_exam_2026`

---

## 🌍 1. Geographic Utilities (Public)

_These APIs call the Adapter Service and do not require authentication._

### Address Autocomplete

Returns address suggestions while the user is typing.

- **URL:** `GET /api/autocomplete`
- **Auth:** ❌ No
- **Query Params:** `text` (e.g. `"Trento"`)
- **Service Flow:** Gateway ➜ Adapter (Nominatim API)
- **Response Example (200 OK):**

````json
[
  "Trento, Trentino-Alto Adige/Südtirol, Italy",
  "Trentola-Ducenta, Caserta, Campania, Italy"
]

## GPS Reverse Geocoding

Retrieves an address starting from GPS coordinates (via the “Current Position” button).

- **URL:** `GET /api/reverse`
- **Auth:** ❌ No
- **Query Params:** lat, lng (es. 46.06, 11.12)
- **Service Flow:** Gateway ➜ Adapter (Nominatim API)
- **Response Example (200 OK):**

```json
{
  "address": "Piazza del Duomo, Trento, Italia"
}
````

## 🩺 2. Core Business (Protected)

These APIs require the x-api-key header and orchestrate the Data, Business, and Adapter layers.

### Doctor Search (Orchestration)

Searches for available slots in the database, calculates user coordinates from the address, and filters results by distance (km).

- **URL:** `POST /api/search`
- **Auth:** ✅ Sì
- **Service Flow:**
  Gateway ➜ Adapter (get lat/lng from address)
  Gateway ➜ Data (retrieve slots by date)
  Gateway ➜ Business (filter slots by distance from user)
- **Request Body (200 OK):**

```json
{
  "address": "Via Brennero, Trento",
  "radius": 15,
  "dateStart": "31-01-2026 08:00",
  "dateEnd": "05-02-2026 18:00"
}
```

- **Response Example (200 OK):**

```json
{
  "success": true,
  "userLocation": { "lat": 46.08, "lng": 11.12 },
  "results": [
    {
      "id": 105,
      "date_start": "2026-02-01 09:30:00",
      "doctor_name": "Dr. Mario Rossi",
      "specialization": "Cardiologia",
      "clinic_name": "Ospedale Santa Chiara",
      "distance": 3.2
    }
  ]
}
```

## Validate Tax Code (CF)

Validates the formal correctness of the Italian Tax Code (Codice Fiscale) using an external Cloudflare Worker service.

- **URL:** `GET /api/validate-cf`
- **Auth:** ✅ Sì
- **Query Params:** `cf` (e.g. `RSSMRA85T10A222Y`)
- **Service Flow:** Gateway ➜ Adapter ➜ External API (Cloudflare Worker)
- **Response Example (200 OK):**

```json
{
  "valid": true,
  "gender": "M",
  "birthDate": "1985-12-10"
}
```

- **Response Example (200 OK):**

```json
{
  "valid": false,
  "error": "Invalid Checksum"
}
```

## Genera OTP

Generates a numeric code (Business layer) and sends it via email (Adapter layer).

- **URL:** `POST /api/otp/send`
- **Auth:** ✅ Sì
- **Service Flow:** Gateway ➜ Business (generate random code) ➜ Adapter (send email via SMTP)
- **Request Body:**

```json
{
  "email": "mario.rossi@studenti.unitn.it"
}
```

- **Response Example:**

```json
{
  "success": true
}
```

## Verify OTP

Checks whether the submitted code matches the generated one (or uses the backdoor)

- **URL:** `POST /api/otp/verify`
- **Auth:** ✅ Sì
- **Service Flow:** Gateway (check in-memory store)
- **Request Body:**

```json
{
  "email": "mario.rossi@studenti.unitn.it",
  "code": "849201"
}
```

- **Response Example (200 OK):**

```json
{
  "success": true
}
```

## Booking

Updates the slot status in the database (Data layer) and sends a confirmation email with a summary (Adapter layer).

- **URL:** `POST /api/book`
- **Auth:** ✅ Sì
- **Service Flow:**
  Gateway ➜ Data (UPDATE slot status='booked')
  Gateway ➜ Data (SELECT slot details: doctor, time, clinic)
  Gateway ➜ Adapter (send HTML confirmation email)

- **Request Body:**

```json
{
  "slot_id": 105,
  "user_email": "mario.rossi@studenti.unitn.it"
}
```

- **Response Example (200 OK):**

```json
{
  "success": true
}
```

- **Error Response (Slot occupato):**

```json
{
  "success": false,
  "message": "Slot occupied"
}
```
