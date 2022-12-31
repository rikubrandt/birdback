const fetch = require("node-fetch");
const parser = require("xml2js");

let VIOLATIONS = new Map();

// No-fly zone radius and center
const NDZ_RADIUS = 100000;
const NDZ_CENTER = [250000, 250000];

const DRONES_URL = "http://assignments.reaktor.com/birdnest/drones";
const PILOTS_URL = "http://assignments.reaktor.com/birdnest/pilots/";

async function handler() {
  console.log("Updating violations...");
  cleanViolations();
  const response = await fetch(DRONES_URL)
    .then((response) => response.text())
    .then((str) => parser.parseStringPromise(str))
    .then((result) => JSON.stringify(result))
    .then((result) => JSON.parse(result))
    .catch((error) => console.log(error));
  const data = response.report.capture;
  if (data.length > 0) {
    const timestamp = data[0].$.snapshotTimestamp;

    const drones = data[0].drone;
    for (let i = 0; i < drones.length; i++) {
      const drone = drones[i];
      if (dist_from_nest(drone.positionX, drone.positionY) < NDZ_RADIUS) {
        const pilot = VIOLATIONS.get(drone.serialNumber);
        // If the pilot already exists, update the timestamp and closest coordinates.
        if (pilot) {
          pilot.timestamp = timestamp;
          if (
            dist_from_nest(drone.positionX, drone.positionY) <
            dist_from_nest(pilot.closestXY[0], pilot.closestXY[1])
          ) {
            pilot.closestXY[0] = drone.positionX;
            pilot.closestXY[1] = drone.positionY;
          }
        } else {
          const info = await getPilot(drones[i].serialNumber);
          const pilot = {
            timestamp: timestamp,
            closestXY: [drone.positionX, drone.positionY],
            firstName: info.firstName,
            lastName: info.lastName,
            email: info.email,
            phoneNumber: info.phoneNumber,
          };
          VIOLATIONS.set(drone.serialNumber, pilot);
        }
      }
    }
  }
}

//Check if violations are over 10 minutes old and clean them.
function cleanViolations() {
  const now = new Date();
  VIOLATIONS.forEach((pilot, serialNumber) => {
    const then = new Date(pilot.timestamp);
    const diff = now.getTime() - then.getTime();
    if (diff > 1000 * 60 * 10) {
      VIOLATIONS.delete(serialNumber);
    }
  });
}

function dist_from_nest(x, y) {
  return Math.sqrt(
    Math.pow(NDZ_CENTER[0] - x, 2) + Math.pow(NDZ_CENTER[1] - y, 2)
  );
}

async function getPilot(serialNumber) {
  const response = await fetch(PILOTS_URL + serialNumber).then((response) =>
    response.json()
  );
  return response;
}

module.exports = { handler, VIOLATIONS };
