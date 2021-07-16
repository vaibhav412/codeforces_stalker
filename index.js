//All Imports
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

var port = process.env.PORT || 3000;

const userRoutes = require("./routes/userRoutes");

//Setting View Engine & static folders
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static(path.join(__dirname, "public")));

app.use(userRoutes);

app.get("/", (req, res, next) => {
	res.render("home", {
		done: 0,
		nick: "",
	});
});

//Error Page
app.use((req, res, next) => {
	res.status(404).render("error-404");
});

app.listen(port, () => {
	console.log(`Connected On Port ${port}!`);
});
