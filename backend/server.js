const express = require("express");
const mongoose = require("mongoose");
const { Client } = require("pg"); // For CockroachDB
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// CockroachDB Connection
const cockroachClient = new Client({
  connectionString: process.env.COCKROACH_URI,
  ssl: {
    rejectUnauthorized: false,
  },
});
cockroachClient
  .connect()
  .then(() => console.log("Connected to CockroachDB"))
  .catch((err) => console.error("CockroachDB connection error:", err));

// Routes
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Example API for shops
app.get("/api/shops", (req, res) => {
  res.json({ message: "List of shops" });
});

// Example API for services
app.get("/api/services", (req, res) => {
  res.json({ message: "List of services" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
