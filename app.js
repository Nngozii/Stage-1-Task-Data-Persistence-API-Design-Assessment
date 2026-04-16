const express = require("express");
var cors = require("cors");

const db = require("./db");

const port = 9100;
const app = express();

app.use(cors());

app.post("/api/profiles", async (req, res) => {
  let { name } = req.query;
  try {
    // Database Existing Data Check
    const row = db.prepare("SELECT 1 FROM profiles WHERE name = ?").get(name);
    if (row) {
      console.log("Data exists");
    } else {
      console.log("Data does not exist");
    }

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

    // Database Creation Logic
    const stmt = db.prepare("INSERT INTO profiles (name) VALUES (?)");
    const result = stmt.run(name);

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

    let processedDateTime = new Date().toISOString();

    res.status(201).json({
      status: "success",
      data: {
        id: result.lastInsertRowid,
        name: genderizeData.name,
        gender: genderizeData.gender,
        gender_probability: genderizeData.probability,
        sample_size: genderizeData.count,
        age: agifyData.age,
        age_group: age_group,
        country_id: nationalizeData.country[0].country_id,
        country_probability: nationalizeData.country[0].probability,
        created_at: processedDateTime,
      },
    });
  } catch (err) {
    res.send(err.message);
  }
});

app.listen(port, () => {
  console.log("Server listen on port", port);
});
