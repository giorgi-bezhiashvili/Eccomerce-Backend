require('dotenv').config();
const express = require("express");
const router = express.Router();
const fs = require("fs");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const DATA_FILE = "./data.json";


const getFileData = () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
};

const saveFileData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).send("Token Missing");

    if (!process.env.ACCESS_TOKEN_SECRET) {
      console.error("ACCESS_TOKEN_SECRET is not set");
      return res.status(500).send("Server Configuration Error");
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).send("Invalid or Expired Token");
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Register
router.post("/", async (req, res) => {
  try {
    const { userN, password, basket } = req.body;
    if (!userN || !password)
      return res.status(400).send("Username and password are required");

    const users = getFileData();
    if (users.find((u) => u.userN === userN))
      return res.status(400).send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      userN,
      password: hashedPassword,
      basket: basket || [],
    };

    users.push(newUser);
    saveFileData(users);

    const { password: _, ...userResponse } = newUser;
    res.status(201).json(userResponse);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { userN, password, rememberMe } = req.body; 
    const users = getFileData();
    const user = users.find((u) => u.userN === userN);
    if (!user) return res.status(400).send("Invalid username or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid username or password");

    const accessToken = jwt.sign(
      { id: user.id, userN: user.userN },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "24h" }
    );

    if (!rememberMe) {
      return res.json({ message: "Login successful", accessToken });
    }

    // Only generate refresh token if rememberMe is true
    const refreshToken = jwt.sign(
      { id: user.id, userN: user.userN },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" }
    );

    const userIndex = users.findIndex((u) => u.id === user.id);
    users[userIndex].refreshToken = refreshToken;
    saveFileData(users);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,   
      secure: true,     
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    });

    res.json({ message: "Login successful", accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken; 
  if (!token) return res.status(401).send("No refresh token");

  const users = getFileData();
  const user = users.find((u) => u.refreshToken === token);
  if (!user) return res.status(403).send("Invalid refresh token");

  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send("Refresh token expired, please log in again");

    const newAccessToken = jwt.sign(
      { id: user.id, userN: user.userN },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ accessToken: newAccessToken });
  });
});
router.post("/logout", (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    const users = getFileData();
    const userIndex = users.findIndex((u) => u.refreshToken === token);
    if (userIndex !== -1) {
      users[userIndex].refreshToken = null; 
      saveFileData(users);
    }
  }
  res.clearCookie("refreshToken");
  res.send("Logged out");
});
// Get basket — protected 
router.get("/:id/basket", authenticateToken, (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).send("Access denied: This is not your basket");

    const users = getFileData();
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).send("User not found");

    res.json(user.basket || []);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Add to basket — protected
router.post("/:id/basket", authenticateToken, (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).send("Access denied");

    const users = getFileData();
    const userIndex = users.findIndex((u) => u.id === req.params.id);
    if (userIndex === -1) return res.status(404).send("User not found");

    if (!users[userIndex].basket) users[userIndex].basket = [];
    users[userIndex].basket.push(req.body);
    saveFileData(users);

    res.json(users[userIndex].basket);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Remove one item — protected
router.delete("/:userId/basket/:productId", authenticateToken, (req, res) => {
  try {
    const { userId, productId } = req.params;
    if (req.user.id !== userId)
      return res.status(403).send("Access denied");

    const users = getFileData();
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return res.status(404).send("User not found");

    const before = users[userIndex].basket.length;
    users[userIndex].basket = users[userIndex].basket.filter(
      (item) => item.id !== productId
    );

    if (users[userIndex].basket.length === before)
      return res.status(404).send("Product not found in basket");

    saveFileData(users);
    res.json(users[userIndex].basket);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Update quantity — protected
router.patch("/:id/basket/:productId", authenticateToken, (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).send("Access denied");

    const users = getFileData();
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).send("User not found");

    const item = user.basket.find((i) => i.id === req.params.productId);
    if (!item) return res.status(404).send("Product not found in basket");

    item.quantity = req.body.quantity ?? item.quantity;
    saveFileData(users);

    res.json({ message: "Quantity updated", updatedItem: item });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Clear basket — protected
router.delete("/:id/basket", authenticateToken, (req, res) => {
  try {
    if (req.user.id !== req.params.id)
      return res.status(403).send("Access denied");

    const users = getFileData();
    const userIndex = users.findIndex((u) => u.id === req.params.id);
    if (userIndex === -1) return res.status(404).send("User not found");

    users[userIndex].basket = [];
    saveFileData(users);
    res.send("Basket cleared");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;