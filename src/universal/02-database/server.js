import express from "express";
import { api } from "./routes.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "hbs");              // Handlebars: HTML templates in the views/ folder

app.get("/", (req, res) => res.send("<h1>Hello, MiniInsta!</h1>"));
app.use("/api", api);

// The last route: nothing matched
app.use((req, res) => res.status(404).json({ error: "No such address" }));

// Error handler (four parameters). Express 5 also sends the errors of async functions here.
// NB! The error text goes to the client, so that during development you can see what happened.
// Is that a good idea in production? Think about what it tells an attacker.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => console.log(`Listening on port ${port}`));
