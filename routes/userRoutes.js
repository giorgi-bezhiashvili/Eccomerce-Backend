const express = require("express");
const router = express.Router();
const fs = require("fs");
const bcrypt = require("bcrypt");

const DATA_FILE = "./data.json";

const getFileData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const saveFileData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

router.post("/", async (req, res) => {
  
  try {
    const { userN, password, id, token, basket } = req.body;

    if (!userN || !password) {
      return res.status(400).send("Username and password are required");
    }

    const users = getFileData();

    if (users.find((u) => u.userN === userN)) {
      return res.status(400).send("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: id || Date.now().toString(),
      userN: userN,
      password: hashedPassword,
      token: token || "",
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


router.post("/login", async (req, res) => {
  const { userN, password } = req.body;
  const users = getFileData();
  const user = users.find((u) => u.userN === userN);

  if (!user) return res.status(400).send("Invalid username or password");

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      res.send("Login successful");
    } else {
      res.status(400).send("Invalid username or password");
    }
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Get basket
router.get("/:id/basket", (req, res) => {
const users = getFileData();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).send("User not found");
  res.json(user.basket || []);
});

//Add to basket
router.post("/:id/basket", (req, res) => {
  const users = getFileData();
  const userIndex = users.findIndex((u) => u.id === req.params.id);

  if (userIndex === -1) return res.status(404).send("User not found");

  if (!users[userIndex].basket) users[userIndex].basket = [];

  users[userIndex].basket.push(req.body);
  saveFileData(users);
  res.json(users[userIndex].basket);
});

//Remove from basket
router.delete("/:userId/basket/:productId", (req, res) => {
  const users = getFileData();
  const { userId, productId } = req.params;

  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) return res.status(404).send("User not found");

  const initialLength = users[userIndex].basket.length;
  users[userIndex].basket = users[userIndex].basket.filter(
    (item) => item.id !== productId,
  );

  if (users[userIndex].basket.length === initialLength) {
    return res.status(404).send("Product not found in basket");
  }

  saveFileData(users);
  res.json(users[userIndex].basket);
});

router.patch("/:id/basket/:productId", (req, res) => {
  const users = getFileData();
  const { id, productId } = req.params;
  const { quantity } = req.body;

  const user = users.find((u) => u.id === id);
  if (!user) return res.status(404).send("User not found");

  const basketItem = user.basket.find((item) => item.id === productId);

  if (!basketItem) {
    return res.status(404).send("Product not found in basket");
  }

  basketItem.quantity = quantity ?? basketItem.quantity;

  saveFileData(users);
  res.status(200).json({
    message: "Quantity updated",
    updatedItem: basketItem,
  });
});
//Clear basket
router.delete("/:id/basket", (req, res) => {
  const users = getFileData();
  const userIndex = users.findIndex((u) => u.id === req.params.id);

  if (userIndex === -1) return res.status(404).send("User not found");

  users[userIndex].basket = [];
  saveFileData(users);
  res.send("Basket cleared");
});

module.exports = router;
