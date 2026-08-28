const fs = require("fs").promises;
const path = require("path");

// Define the exact keys we want to extract for each section
const REQUIRED_PERMIT_KEYS = [
  "PermitId",
  "PermitNumber",
  "PermitType",
  "PermitStatus",
  "IssueDate",
  "ExpireDate",
  "FinalizeDate",
  "ApplyDate",
  "WorkClassName",
  "Description",
  "IVRNumber",
  "MainAddress",
  "MainParcelNumber",
  "AssignedTo",
  "AssignedToEmail",
  "ProjectName",
  "DistrictName",
  "SquareFeet",
  "Value",
];

const REQUIRED_ADDRESS_KEYS = [
  "AddressLine1",
  "AddressLine2",
  "AddressLine3",
  "City",
  "State",
  "County",
  "Country",
  "PostalCode",
  "StreetType",
];

const REQUIRED_CONTACT_KEYS = [
  "ContactTypeName",
  "GlobalEntityName",
  "FirstName",
  "LastName",
  "IsBilling",
  "IsBillingDisplayText",
  "Title",
  "ContactStatus",
];

const REQUIRED_INSPECTION_KEYS = [
  "InspectionId",
  "InspectionType",
  "InspectionTypeDescription",
  "InspectionStatus",
  "RequestedDate",
  "ScheduledStartDate",
  "PrimaryInspector",
  "PrimaryInspectorEmail",
  "IsReinspectionDisplayText",
  "WorkflowActionId",
  "InspectionNumber",
];

const REQUIRED_SUMMARY_KEYS = [
  "Name",
  "FriendlyName",
  "ActivityType",
  "ActivityTypeName",
  "ActivityStatusName",
  "CompletedOn",
  "ScheduledStartDate",
  "Status",
];

/**
 * Extracts required keys from an object. If a key is missing,
 * it sets the value to null and adds it to the missing log.
 */
function safeExtract(sourceObj, keysList, contextPath, logList, fileName) {
  const extracted = {};

  // Check if sourceObj is a valid object (and not an array or null)
  if (
    typeof sourceObj !== "object" ||
    sourceObj === null ||
    Array.isArray(sourceObj)
  ) {
    logList.push(
      `[${fileName}] ${contextPath} is completely missing or malformed.`,
    );
    keysList.forEach((key) => (extracted[key] = null));
    return extracted;
  }

  keysList.forEach((key) => {
    if (key in sourceObj && sourceObj[key] !== null && sourceObj[key] !== "") {
      extracted[key] = sourceObj[key];
    } else {
      extracted[key] = null;
      logList.push(`[${fileName}] Missing/Empty: ${contextPath}.${key}`);
    }
  });

  return extracted;
}

async function cleanJsonFiles(inputFolder, outputFolder) {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputFolder, { recursive: true });

    // Read directory and filter for .json files
    const files = await fs.readdir(inputFolder);
    const jsonFiles = files.filter((file) =>
      file.toLowerCase().endsWith(".json"),
    );
    const totalFiles = jsonFiles.length;

    console.log(`Starting extraction for ${totalFiles} files...\n`);

    const missingDataLog = [];
    const fatalErrorLog = [];
    let processedCount = 0;

    for (const fileName of jsonFiles) {
      const filepath = path.join(inputFolder, fileName);

      try {
        const rawData = await fs.readFile(filepath, "utf-8");
        const data = JSON.parse(rawData);

        const cleanedData = {};

        // --- 1. PERMIT EXTRACTION ---
        const permitSource = data.permit?.Result || {};
        const cleanedPermit = safeExtract(
          permitSource,
          REQUIRED_PERMIT_KEYS,
          "permit",
          missingDataLog,
          fileName,
        );

        const addressSource = permitSource.MainAddressInfo || {};
        const cleanedAddress = safeExtract(
          addressSource,
          REQUIRED_ADDRESS_KEYS,
          "permit.MainAddressInfo",
          missingDataLog,
          fileName,
        );

        cleanedPermit.MainAddressInfo = cleanedAddress;
        cleanedData.permit = cleanedPermit;

        // --- 2. CONTACTS EXTRACTION ---
        const contactsSource = data.contacts || {};
        cleanedData.contacts = {
          TotalFound: contactsSource.TotalFound || 0,
          Result: [],
        };

        const contactResults = contactsSource.Result;
        if (Array.isArray(contactResults) && contactResults.length > 0) {
          contactResults.forEach((contact, idx) => {
            const cleanedContact = safeExtract(
              contact,
              REQUIRED_CONTACT_KEYS,
              `contacts.Result[${idx}]`,
              missingDataLog,
              fileName,
            );
            cleanedData.contacts.Result.push(cleanedContact);
          });
        } else {
          missingDataLog.push(
            `[${fileName}] Missing/Empty: contacts.Result array`,
          );
        }

        // --- 3. INSPECTIONS EXTRACTION ---
        const inspectionsSource = data.inspections || {};
        cleanedData.inspections = {
          TotalFound: inspectionsSource.TotalFound || 0,
          Result: [],
        };

        const inspectionResults = inspectionsSource.Result;
        if (Array.isArray(inspectionResults) && inspectionResults.length > 0) {
          inspectionResults.forEach((inspection, idx) => {
            const cleanedInspection = safeExtract(
              inspection,
              REQUIRED_INSPECTION_KEYS,
              `inspections.Result[${idx}]`,
              missingDataLog,
              fileName,
            );
            cleanedData.inspections.Result.push(cleanedInspection);
          });
        } else {
          missingDataLog.push(
            `[${fileName}] Missing/Empty: inspections.Result array`,
          );
        }

        // --- 4. SUMMARY EXTRACTION ---
        const summarySource = data.summary || {};
        cleanedData.summary = { Result: [] };

        const summaryResults = summarySource.Result;
        if (Array.isArray(summaryResults) && summaryResults.length > 0) {
          summaryResults.forEach((summaryItem, idx) => {
            const cleanedSummary = safeExtract(
              summaryItem,
              REQUIRED_SUMMARY_KEYS,
              `summary.Result[${idx}]`,
              missingDataLog,
              fileName,
            );
            cleanedData.summary.Result.push(cleanedSummary);
          });
        } else {
          missingDataLog.push(
            `[${fileName}] Missing/Empty: summary.Result array`,
          );
        }

        // --- 5. SAVE CLEANED FILE ---
        const outputFilepath = path.join(outputFolder, fileName);
        await fs.writeFile(
          outputFilepath,
          JSON.stringify(cleanedData, null, 2),
          "utf-8",
        );

        processedCount++;
      } catch (e) {
        // Catching specific errors and putting them in the fatal error log
        if (e instanceof SyntaxError) {
          fatalErrorLog.push(
            `[${fileName}] JSON Decode Error (File might be empty or corrupted): ${e.message}`,
          );
        } else {
          fatalErrorLog.push(`[${fileName}] Unexpected Error: ${e.message}`);
        }
      }
    }

    // --- Write the Enhanced Missing Data Log ---
    const logFilepath = path.join(outputFolder, "missing_data_log.txt");
    let logContent = `Extraction attempted for ${totalFiles} files.\n`;
    logContent += `Successfully processed: ${processedCount}\n`;
    logContent += `Totally failed files: ${fatalErrorLog.length}\n`;

    // Write Fatal Errors
    if (fatalErrorLog.length > 0) {
      logContent += "\n" + "=".repeat(60) + "\n";
      logContent += "CRITICAL FILE FAILURES (THESE FILES WERE SKIPPED)\n";
      logContent += "=".repeat(60) + "\n\n";
      logContent += fatalErrorLog.join("\n") + "\n";
    }

    logContent += "\n" + "=".repeat(60) + "\n";
    logContent += "LOG OF MISSING REQUIRED FIELDS (FILES WERE PROCESSED)\n";
    logContent += "=".repeat(60) + "\n\n";
    logContent += missingDataLog.join("\n") + "\n";

    await fs.writeFile(logFilepath, logContent, "utf-8");

    // --- Terminal Output ---
    console.log(
      `\nCompleted! Processed ${processedCount} out of ${totalFiles} files.`,
    );

    // Explicitly print out the failed file in the terminal so you see it instantly
    if (fatalErrorLog.length > 0) {
      console.log(
        "\n[WARNING] The following files encountered critical errors and were skipped:",
      );
      fatalErrorLog.forEach((error) => console.log(`  -> ${error}`));
    }

    console.log(`\nCleaned JSONs and logs saved in: ${outputFolder}`);
  } catch (err) {
    console.error("A critical error occurred initializing the script:", err);
  }
}

// --- HOW TO USE ---
// Use double backslashes for Windows paths in strings, or forward slashes.
// const inputPath =
//   "C:\\Users\\itsro\\OneDrive\\Desktop\\County Scrapers\\tyler.host\\permits";
// const outputPath = "NEWcleaned\\";

// cleanJsonFiles(inputPath, outputPath);

/**
 * Cleans a single permit JSON object.
 *
 * @param {Object} inputJson - The parsed raw JSON object.
 * @param {String} fileName - The name of the file (used for logging missing fields).
 * @returns {Object} The cleaned JSON object.
 */
function cleanJsonObject(inputJson, fileName) {
  const missingDataLog = [];
  const cleanedData = {};

  try {
    // --- 1. PERMIT EXTRACTION ---
    const permitSource = inputJson.permit?.Result || {};
    const cleanedPermit = safeExtract(
      permitSource,
      REQUIRED_PERMIT_KEYS,
      "permit",
      missingDataLog,
      fileName,
    );

    const addressSource = permitSource.MainAddressInfo || {};
    const cleanedAddress = safeExtract(
      addressSource,
      REQUIRED_ADDRESS_KEYS,
      "permit.MainAddressInfo",
      missingDataLog,
      fileName,
    );

    cleanedPermit.MainAddressInfo = cleanedAddress;
    cleanedData.permit = cleanedPermit;

    // --- 2. CONTACTS EXTRACTION ---
    const contactsSource = inputJson.contacts || {};
    cleanedData.contacts = {
      TotalFound: contactsSource.TotalFound || 0,
      Result: [],
    };

    const contactResults = contactsSource.Result;
    if (Array.isArray(contactResults) && contactResults.length > 0) {
      contactResults.forEach((contact, idx) => {
        const cleanedContact = safeExtract(
          contact,
          REQUIRED_CONTACT_KEYS,
          `contacts.Result[${idx}]`,
          missingDataLog,
          fileName,
        );
        cleanedData.contacts.Result.push(cleanedContact);
      });
    } else {
      missingDataLog.push(`[${fileName}] Missing/Empty: contacts.Result array`);
    }

    // --- 3. INSPECTIONS EXTRACTION ---
    const inspectionsSource = inputJson.inspections || {};
    cleanedData.inspections = {
      TotalFound: inspectionsSource.TotalFound || 0,
      Result: [],
    };

    const inspectionResults = inspectionsSource.Result;
    if (Array.isArray(inspectionResults) && inspectionResults.length > 0) {
      inspectionResults.forEach((inspection, idx) => {
        const cleanedInspection = safeExtract(
          inspection,
          REQUIRED_INSPECTION_KEYS,
          `inspections.Result[${idx}]`,
          missingDataLog,
          fileName,
        );
        cleanedData.inspections.Result.push(cleanedInspection);
      });
    } else {
      missingDataLog.push(
        `[${fileName}] Missing/Empty: inspections.Result array`,
      );
    }

    // --- 4. SUMMARY EXTRACTION ---
    const summarySource = inputJson.summary || {};
    cleanedData.summary = { Result: [] };

    const summaryResults = summarySource.Result;
    if (Array.isArray(summaryResults) && summaryResults.length > 0) {
      summaryResults.forEach((summaryItem, idx) => {
        const cleanedSummary = safeExtract(
          summaryItem,
          REQUIRED_SUMMARY_KEYS,
          `summary.Result[${idx}]`,
          missingDataLog,
          fileName,
        );
        cleanedData.summary.Result.push(cleanedSummary);
      });
    } else {
      missingDataLog.push(`[${fileName}] Missing/Empty: summary.Result array`);
    }

    // --- 5. ATTACHMENT EXTRACTION --- < YOLO
    const attachment = inputJson.attachment || {};
    cleanedData.attachment = attachment;

    // Return the final cleaned object
    return cleanedData;
  } catch (e) {
    console.error(
      `\n[CRITICAL ERROR] Failed to process ${fileName}: ${e.message}`,
    );
    // Re-throw the error so your outer logic knows this specific file failed
    throw e;
  }
}

module.exports = { cleanJsonFiles, cleanJsonObject };
