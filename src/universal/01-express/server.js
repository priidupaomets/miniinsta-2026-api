import express from "express";
import { api } from "./routes.js";

const app = express();
const port = process.env.PORT || 3000;      // from an environment variable, or 3000 if there is none

app.get("/", (req, res) => res.send("<h1>Hello, MiniInsta!</h1>"));
app.use("/api", api);                       // everything under /api/… goes to routes.js

// The last route: nothing matched
app.use((req, res) => res.status(404).json({ error: "No such address" }));

app.listen(port, () => console.log(`Listening on port ${port}`));
