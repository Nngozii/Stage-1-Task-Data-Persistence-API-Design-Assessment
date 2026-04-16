const express = require("express");
var cors = require("cors");
require("dotenv").config();
const { uuidv7 } = require("uuidv7");
const { Pool } = require("pg");

const port = process.env.PORT || 9100;
const app = express();

// ─── Database Setup ───────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    gender TEXT,
    gender_probability REAL,
    sample_size INTEGER,
    age INTEGER,
    age_group TEXT,
    country_id TEXT,
    country_probability REAL,
    created_at TEXT
  )
`);

app.use(cors());
app.use(express.json());

// Create Profile Endpoint
app.post("/api/profiles", async (req, res) => {
  let { name } = req.body; // fix 1: was req.query

  // Validation
  if (name === undefined || name === "") {
    return res
      .status(400)
      .json({ status: "error", message: "Missing or empty name" });
  }

  if (typeof name !== "string") {
    return res
      .status(422)
      .json({ status: "error", message: "Name must be a string" });
  }

  // Database Existing Data Check
  const existingRow = await pool.query(
    "SELECT * FROM profiles WHERE name = $1",
    [name],
  );
  if (existingRow.rows[0]) {
    return res.status(201).json({
      status: "success",
      message: "Profile already exists",
      data: existingRow.rows[0],
    });
  }

  try {
    // API Calls
    const genderizeResponse = await fetch(
      `https://api.genderize.io/?name=${name}`,
    );
    const agifyResponse = await fetch(`https://api.agify.io?name=${name}`);
    const nationalizeResponse = await fetch(
      `https://api.nationalize.io?name=${name}`,
    );

    // API Responses
    const genderizeData = await genderizeResponse.json();
    const agifyData = await agifyResponse.json();
    const nationalizeData = await nationalizeResponse.json();
    console.log("called apis");

    // Edge case checks
    if (!genderizeData.gender || genderizeData.count === 0) {
      return res.status(502).json({
        status: "error",
        message: "Genderize returned an invalid response",
      });
    }

    if (!agifyData.age) {
      return res.status(502).json({
        status: "error",
        message: "Agify returned an invalid response",
      });
    }

    if (!nationalizeData.country || nationalizeData.country.length === 0) {
      return res.status(502).json({
        status: "error",
        message: "Nationalize returned an invalid response",
      });
    }

    // Age Classification Logic
    let age_group;
    const age = agifyData.age;

    if (age >= 0 && age <= 12) {
      age_group = "child";
    } else if (age >= 13 && age <= 19) {
      age_group = "teenager";
    } else if (age >= 20 && age <= 59) {
      age_group = "adult";
    } else {
      age_group = "senior";
    }

    // Data Creation Timestamp
    let created_at = new Date().toISOString();

    // Implementing UUID v7
    const id = uuidv7();

    // Data Response. To avoid code repetition
    data_response = {
      id: id,
      name: genderizeData.name,
      gender: genderizeData.gender,
      gender_probability: genderizeData.probability,
      sample_size: genderizeData.count,
      age: agifyData.age,
      age_group: age_group,
      country_id: nationalizeData.country[0].country_id,
      country_probability: nationalizeData.country[0].probability,
      created_at: created_at,
    };

    // Database Creation Logic
    await pool.query(
      `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data_response.id,
        data_response.name,
        data_response.gender,
        data_response.gender_probability,
        data_response.sample_size,
        data_response.age,
        data_response.age_group,
        data_response.country_id,
        data_response.country_probability,
        data_response.created_at,
      ],
    );

    res.status(201).json({
      status: "success",
      data: data_response,
    });
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({
        status: "error",
        message: "Upstream API timed out",
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  }
});

// Get Single Profile Endpoint
app.get(`/api/profiles/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM profiles WHERE id = $1", [
      id,
    ]);
    const profile = result.rows[0];

    if (!profile)
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" }); // fix 2: check before responding

    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({
        status: "error",
        message: "Upstream API timed out",
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  }
});

// Get All Profiles Endpoint
app.get(`/api/profiles`, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM profiles");
    const profiles = result.rows;

    if (!profiles)
      return res.status(404).json({ status: "error", message: "Not found" }); // fix 2: check before responding

    res.status(200).json({
      status: "success",
      count: profiles.length, // fix 5: added count
      data: profiles,
    });
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({
        status: "error",
        message: "Upstream API timed out",
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  }
});

// Delete Selected Profile Endpoint
app.delete(`/api/profiles/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT 1 FROM profiles WHERE id = $1", [
      id,
    ]);

    if (!result.rows[0])
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" }); // fix 2: check before responding

    await pool.query("DELETE FROM profiles WHERE id = $1", [id]);
    res.status(200).json({
      status: "success",
    });
  } catch (err) {
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(502).json({
        status: "error",
        message: "Upstream API timed out",
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  }
});

app.listen(port, () => {
  console.log("Server listen on port", port);
});
