const express = require("express");
var cors = require("cors");
const { uuidv7 } = require("uuidv7");

const db = require("./db");

const port = 9100;
const app = express();

app.use(cors());

// Create Profile Endpoint
app.post("/api/profiles", async (req, res) => {
  let { name } = req.query;

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
  const existingRow = db
    .prepare("SELECT * FROM profiles WHERE name = ?")
    .get(name);
  if (existingRow) {
    return res.status(201).json({
      status: "success",
      message: "Profile already exists",
      data: existingRow,
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
    const stmt = db
      .prepare(
        `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
      VALUES (@id, @name, @gender, @gender_probability, @sample_size, @age, @age_group, @country_id, @country_probability, @created_at)`,
      )
      .run(data_response);

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
    const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(id);
    res.status(200).json({
      status: "success",
      data: profile,
    });
    if (!profile) return res.status(404).json({ message: "Not found" });
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
    const profile = db.prepare("SELECT * FROM profiles").all();
    res.status(200).json({
      status: "success",
      data: profile,
    });
    if (!profile) return res.status(404).json({ message: "Not found" });
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
    const profile = db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
    res.status(200).json({
      status: "success",
    });
    if (!profile) return res.status(404).json({ message: "Not found" });
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
