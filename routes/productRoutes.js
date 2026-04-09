const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const PRODUCTS_FILE = path.join(__dirname, "../productdata.json");

const getProductsFileData = () => {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

router.get("/", (req, res) => {
   const products = getProductsFileData();
   res.json(products);
});

module.exports = router;