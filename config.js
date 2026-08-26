const base = "https://etrac.savannahga.gov/EnerGov_Prod/"; // No trailing slash

const dateOffset = 2; // 1 = yesterday

// statuses that need to pulled using daily.js
const requiredStatuses = ["Issued"];

// permit types
const requiredSecondaryData = [
  "Commercial Building Addition",
  "Commercial Building Renovation",
  "New Commercial Building",
  "New Residential Building",
  "Residential Building Addition",
  "Residential Building Renovations",
];

//status that need be updated
const updateStatuses = ["Issued"];

// exports
module.exports = {
  base,
  dateOffset,
  requiredStatuses,
  requiredSecondaryData,
  updateStatuses,
};
