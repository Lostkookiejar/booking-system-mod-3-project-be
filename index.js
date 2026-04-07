let express = require("express");
let path = require("path");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { DATABASE_URL, SECRET_KEY } = process.env;

let app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    require: true,
  },
});

app.post("/signup", async (req, res) => {
  const client = await pool.connect();
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      "SELECT * FROM r_users WHERE username = $1",
      [username],
    );

    if (userResult.rows.length > 0) {
      return res.status(400).json({ message: "Username already taken" });
    }

    await client.query(
      "INSERT INTO r_users (username, password) VALUES ($1, $2)",
      [username, hashedPassword],
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post("/login", async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM r_users WHERE username = $1",
      [req.body.username],
    );

    const user = result.rows[0];

    if (!user)
      return res.status(400).json({ message: "Username or pasword incorrect" });

    const passwordIsValid = await bcrypt.compare(
      req.body.password,
      user.password,
    );
    if (!passwordIsValid)
      return res.status(401).json({ auth: false, token: null });

    var token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
      expiresIn: 86400,
    });
    res.status(200).json({ auth: true, token: token });
  } catch (error) {
    console.error("Error: ", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post("/reservs", async (req, res) => {
  const client = await pool.connect();
  const { name, description, date, phone, email, created_at, user_id } =
    req.body;
  try {
    const userExists = await client.query(
      "SELECT id FROM r_users WHERE id = $1",
      [user_id],
    );
    if (userExists.rows.length > 0) {
      const result = await client.query(
        `INSERT INTO reservs (name, description, date, phone, email, created_at, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
        [name, description, date, phone, email, created_at, user_id],
      );

      console.log(`Reservation created successfully with id ${result.rows[0]}`);

      res.json({
        status: "success",
        data: result.rows[0],
        message: "Reservation created successfully",
      });
    } else {
      res.status(400).json({ error: "User does not exist" });
    }
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

app.get("/reservs/user/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const client = await pool.connect();

  try {
    const reservs = await client.query(
      "SELECT * FROM reservs WHERE user_id = $1",
      [user_id],
    );
    if (reservs.rowCount > 0) {
      res.json(reservs.rows);
    } else {
      res.status(404).json({ error: "No reservations found for this user" });
    }
  } catch (error) {
    console.error("Error", error.message);
    res.status(500).json({ error: error.message });
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

app.delete("/reservs/:created_at", async (req, res) => {
  const { created_at } = req.params;
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
