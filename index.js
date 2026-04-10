const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

app.use(express.json());


app.use("/users", userRoutes);
app.use("/product", productRoutes);



https.createServer(options, app).listen(3000, () => {
  console.log(`Secure server spinning on https://localhost:3000`);
});