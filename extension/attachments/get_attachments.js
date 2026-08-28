/**
 * Gets Attachements
 *
 * @param {string} entityId - The ID of the workflow/entity (defaults to the one in the cURL).
 * @param {number|string} moduleId - The module ID (defaults to 1).
 * @returns {Promise<Object>} - The JSON response from the API.
 */

async function get_attachments(entityId, base, auth, moduleId = 1) {
  // Construct the URL dynamically using the provided IDs
  const url = `${base}/selfservice/api/energov/entity/attachments/search/entityattachments/${entityId}/${moduleId}/true`;

  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    pragma: "no-cache",
    priority: "u=1, i",
    referer: `${base}/SelfService`,
    "sec-ch-ua":
      '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    tenantid: "1",
    tenantname: "WakeCountyNCProd",
    "tyler-tenant-culture": "en-US",
    "tyler-tenanturl": "WakeCountyNCProd",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    Cookie: "Tyler-Tenant-Culture=en-US",
    authorization: auth,
  };

  try {
    const response = await fetch(url, {
      method: "GET", // No data payload, so this is a standard GET request
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const application = get_latest_application(data);
    return application;
  } catch (error) {
    console.error("Error fetching attachments:", error);
    throw error;
  }
}

function get_latest_application(inputData) {
  const attachments = inputData?.Result?.Attachments || [];

  // 1. Filter for application files
  const applicationAttachments = attachments.filter((attachment) => {
    const fileName = (attachment.FileName || "").toLowerCase();
    return fileName.includes("app");
  });

  // Return null if none found
  if (applicationAttachments.length === 0) {
    return null;
  }

  // 2. Find the most recent attachment by AddedOn date
  const latest = applicationAttachments.reduce((latest, current) => {
    return new Date(current.AddedOn) > new Date(latest.AddedOn)
      ? current
      : latest;
  });

  // 3. Return only AttachmentID, FileName, and AddedOn
  const result = {
    AttachmentID: latest.AttachmentID,
    FileName: latest.FileName,
    AddedOn: latest.AddedOn,
  };

  // console.log(JSON.stringify(result, null, 2));
  return result;
}

// Export using CommonJS
module.exports = get_attachments;
