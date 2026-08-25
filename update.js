//status
const getDataByStatus = require("./src/db/getPreviousData.js");
const fetchNewPermits = require("./src/utils/fetchPermits.js");

const { comparePermitHashes } = require("./src/utils/hash.compare.js");

const uploadFolder = require("./src/db/upload.js");

const cleanupFolders = require("./src/utils/deleteFolders.js");
const loadJson = require("./src/utils/load.js");
const {
  validateStatuses,
  validatePermitTypes,
} = require("./src/utils/validate.config.js");

const fs = require("fs");

// configs
const {
  base,
  dateOffset,
  requiredStatuses,
  requiredSecondaryData,
  updateStatuses,
} = require("./config.js");

// making sure the files exits
const statusIds = loadJson("./site.data/status.ids.json");

//validate the the contents of the array matches with the files
validateStatuses(statusIds, updateStatuses);

// token
const { getToken } = require("./login/token.js");

async function process(status) {
  //get
  console.log(
    "\x1b[33m Now fetching all permit data based on the selected status... \x1b[0m",
  );
  const datafile = await getDataByStatus(status);

  //new permits
  console.log("\x1b[33m Now downloading and saving new permits... \x1b[0m");

  await fetchNewPermits(datafile, "permits", base); //saves data to permits folder

  // comparing
  console.log(
    "\x1b[33m Now comparing cleaned data with existing records... \x1b[0m",
  );

  await comparePermitHashes(datafile, "permits", "DIFF_FOLDER");

  //then push the diff folder to db

  console.log("\x1b[33m Now pushing folder to DB \x1b[0m");

  await uploadFolder("DIFF_FOLDER");

  //delete diff_folder , permits , and cleaned_permits folders
  await cleanupFolders(["DIFF_FOLDER", "permits", "cleaned_permits"]);
  fs.rmSync(datafile, { force: true });
}

// process(status);

const statuses = updateStatuses;

const tokenTimer = setInterval(
  () => {
    console.log(
      "⏰ 45 minutes passed! Fetching token again in the background...",
    );
    getToken().catch((err) =>
      console.error("Error in background getToken:", err),
    );
  },
  45 * 60 * 1000,
); // 600,000 milliseconds

let firstTime = true;

async function update() {
  for (const status of statuses) {
    if (firstTime) {
      await getToken();
      firstTime = false;
    }

    await process(status);
    console.log(`Completed : ${status}`);
  }
  console.log("All statuses Completed");
  clearInterval(tokenTimer);
}

update();
