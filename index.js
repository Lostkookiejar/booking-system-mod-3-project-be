let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const { DATABASE_URL } = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    require: true,
  },
});

app.post("/reservs", async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, date, phone, email, created_at } = req.body;

    const result = await client.query(
      `INSERT INTO reservs (name, description, date, phone, email, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING created_at`,
      [name, description, date, phone, email, created_at],
    );

    console.log(
      `Post created successfully with id ${result.rows[0].created_at}`,
    );

    res.json({
      status: "success",
      data: result.rows[0],
      message: "Post created successfully",
    });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get("/reservs", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM reservs");
    res.json(result.rows);
  } catch (error) {
    console.log(error.stack);
    res.status(500).send("An error occurred");
  } finally {
    client.release();
  }
});

app.put("/reservs", async (req, res) => {
  const { name, description, date, phone, email, created_at } = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      `
      UPDATE reservs SET name = $1, description = $2, date = $3, phone = $4, email = $5  WHERE created_at = $6
      `,
      [name, description, date, phone, email, created_at],
    );

    res.json({
      status: "success",
      message: "Reservation updated successfully",
    });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.delete("/reservs", async (req, res) => {
  const { created_at } = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      `
        DELETE FROM reservs WHERE created_at = $1
      `,
      [created_at],
    );

    res.json({
      status: "success",
      message: "Reservation deleted successfully",
    });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname + "/404.html"));
});

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
