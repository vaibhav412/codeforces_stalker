const express = require("express");

const controller = require("../controllers/userController");

const router = express.Router();

router.post("/details", controller.getDetails);
router.post("/downloadSubmissions/:nick", controller.downloadSolutions);

module.exports = router;
