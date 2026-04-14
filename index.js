const express = require("express");
const app = express();
const https = require("https");
const fs = require("fs");
const helmet = require("helmet")
const rateLimit = require(`express-rate-limit`)
const cookieParser = require("cookie-parser");

app.use(cookieParser())

const limiter = rateLimit({
    windowMs : 60 * 1000,
    max:20,
    message:"Request limit is reached"
})
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
app.use(helmet())
app.use(express.json());
app.use(limiter)

app.use("/users", userRoutes);
app.use("/product", productRoutes);



https.createServer(options, app).listen(3000, () => {
  console.log(`HTTPS server spinning on https://localhost:3000`);
});