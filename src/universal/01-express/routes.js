import { Router } from "express";

export const api = Router();

// All users. There is no database yet, the answer is a placeholder.
api.get("/users", (req, res) => {
  res.send("All users (placeholder)");
});

// One user: :id is either a number or a username.
// Express always gives it in req.params.id as TEXT.
api.get("/users/:id", (req, res) => {
  const id = req.params.id;

  if (/^\d+$/.test(id)) {
    res.send(`User with the number ${id} (placeholder)`);
  } else {
    res.send(`User with the name ${id} (placeholder)`);
  }
});
