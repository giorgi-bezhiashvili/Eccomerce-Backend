const express = require("express");
const fs = require("fs");
const app = express();
const bcrypt = require("bcrypt");
require('./login.js');
app.use(express.json());

const DATA_FILE = "./data.json";

// Helper to read data (prevents the 'require' cache issue)
const getFileData = () => {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
};

app.get("/users", (req, res) => {
    const users = getFileData();
    res.json(users);
});

app.post("/users", async (req, res) => {
    try {
        const users = getFileData();

        // 1. CHECK FOR DUPLICATES (Very important!)
        const userExists = users.find(u => u.userN === req.body.userN);
        if (userExists) return res.status(400).send("User already exists");

        // 2. HASH THE PASSWORD
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // 3. CREATE THE OBJECT ONCE
        const newUser = {
            id: req.body.id || Date.now().toString(), // Fallback ID if none provided
            userN: req.body.userN,
            password: hashedPassword, // Save only the hash
            token: req.body.token,
            basket: req.body.basket || []
        };

        // 4. SAVE
        users.push(newUser);
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));

        // 5. RESPOND SAFELY
        const { password, ...userResponse } = newUser; 
        console.log(`User ${userResponse.userN} added!`);
        res.status(201).json(userResponse);

    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Server Error");
    }
});
//login

app.post('/users/login', async (req, res) => {
    // FIX: You must load the users from the file first!
    const users = getFileData(); 
    
    const user = users.find(u => u.userN === req.body.userN);
    
    if (!user) return res.status(400).send("Invalid username or password");
    
    try {
        if (await bcrypt.compare(req.body.password, user.password)) {
            res.send("Login successful");
        } else {
            res.status(400).send("Invalid username or password");
        }
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

//Basket routes
app.post("/users/:id/basket", (req, res) => {
    const users = getFileData();
    // Use findIndex so we can update the array directly
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) return res.status(404).send("User not found");
    
    // Ensure the basket exists as an array
    if (!users[userIndex].basket) {
        users[userIndex].basket = [];
    }

    // Push the whole object sent in the request
    users[userIndex].basket.push(req.body); 
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    
    res.json(users[userIndex].basket);
});
app.listen(3000, () => console.log(`Server spinning on port 3000`));