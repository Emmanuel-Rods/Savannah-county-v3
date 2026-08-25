const fs = require("fs");
const path = require("path");

const get_contacts = require("../apis/contacts.js");
const get_fees = require("../apis/fees.js");
const get_holds = require("../apis/holds.js");
const get_inspection = require("../apis/inspection.js");
const get_permit = require("../apis/permit.js");
const get_summary = require("../apis/summary.js");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// utils
const { cleanJsonObject } = require("./cleaner.js");
const { hash } = require("./create.hash.js");

async function fetchNewPermits(file, outputFolder = "permits", base) {
  try {
    // Ensure the "permits" folder exists
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // Read and parse input file
    const fileContent = fs.readFileSync(file, "utf8");
    const permits = JSON.parse(fileContent);

    console.log(`Loaded ${permits.length} cases. Starting data extraction...`);

    for (const permitCase of permits) {
      const CaseId = permitCase.permit_id || permitCase.CaseId;
      // Try to get permit_number, if not there, fallback to CaseNumber
      const CaseNumber = permitCase.permit_number || permitCase.CaseNumber;

      if (!CaseId || !CaseNumber) {
        console.warn("Skipping record due to missing CaseId or CaseNumber.");
        continue;
      }

      console.log(`Processing Case: ${CaseNumber} (${CaseId})...`);

      let token;
      try {
        // 1. Check if file exists and read it
        token = fs.readFileSync("token", "utf-8").trim();

        // 2. Check if the file was empty
        if (!token) {
          throw new Error("Token file exists but is completely empty.");
        }
      } catch (error) {
        // 3. Print a clear fatal error message and kill everything immediately
        console.error("\n💥 FATAL ERROR: Unable to load authentication token!");
        console.error(`Reason: ${error.message}`);
        console.error(
          "Aborting execution to prevent partial/corrupted data.\n",
        );

        process.exit(1);
      }

      const auth = `Bearer ${token}`;

      try {
        const [contacts, inspections, permit, summary] = await Promise.all([
          get_contacts(CaseId, base, auth).catch((err) => ({
            error: true,
            message: err.message,
          })),
          get_inspection(CaseId, base, auth).catch((err) => ({
            error: true,
            message: err.message,
          })),
          get_permit(CaseId, base, auth).catch((err) => ({
            error: true,
            message: err.message,
          })),
          get_summary(CaseId, base, auth).catch((err) => ({
            error: true,
            message: err.message,
          })),
        ]);

        // Structure the consolidated object
        const consolidatedData = {
          metadata: permitCase, // Optional: keeps original file values alongside details
          contacts,
          inspections,
          permit,
          summary,
        };

        // Sanitize CaseNumber to ensure valid filesystem filename
        const safeFileName = `${CaseNumber.replace(/[/\\?%*:|"<>]/g, "-")}.json`;
        const destinationPath = path.join(outputFolder, safeFileName);

        //cleaning the file before writing to skip a step
        const cleanedData = cleanJsonObject(consolidatedData, safeFileName);
        const permit_hash = hash(cleanedData);
        const data_with_permit_hash = {
          permit_data: cleanedData,
          permit_hash: permit_hash,
        };
        // Write the gathered data to its file
        fs.writeFileSync(
          destinationPath,
          JSON.stringify(data_with_permit_hash, null, 2),
        );

        console.log(`Saved -> ${safeFileName}`);
        await delay(500); // doubled the delay timings
      } catch (caseError) {
        console.error(`Error processing Case ${CaseNumber}:`, caseError);
      }
    }

    console.log("All tasks completed.");
  } catch (err) {
    console.error("Failed to run extraction process:", err);
  }
}

module.exports = fetchNewPermits;
