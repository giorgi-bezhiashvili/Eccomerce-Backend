const express = require("express");
const app = express();

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");

app.use(express.json());

app.use("/users", userRoutes);
app.use("/product", productRoutes);

app.listen(3000, () => console.log(`Server spinning on port 3000`));