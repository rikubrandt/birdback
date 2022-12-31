const express = require("express");
const drones = require("./drones");
const app = express();

const PORT = process.env.PORT || 5000;

let lastRequestTime = Date.now();

let idleChecker;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Origin");
  lastRequestTime = Date.now();
  if (!idleChecker) {
    idleChecker = setInterval(() => {
      if (Date.now() - lastRequestTime > 60 * 1000 * 10) {
        // No requests have been made in the  last 10 minutes, so stop checking the violations
        console.log(
          "No requests have been made in the last 10 minutes, stopping the checker..."
        );
        clearInterval(idleChecker);
        idleChecker = null;
      } else {
        // Update the violations
        drones.handler();
      }
    }, 1000);
  }
  next();
});

app.get("/", (req, res) => {
  res.send("Hire me!");
});

app.get("/drones", (req, res) => {
  console.log("Drones requested");
  res.send(Object.fromEntries(drones.VIOLATIONS));
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
});
