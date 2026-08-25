/**
 * Fetches contact details from the Wake County EnerGov API.
 *
 * @param {string} entityId - The ID of the permit/entity.
 * @param {Object} options - Optional overrides for the JSON payload (e.g., PageNumber, PageSize).
 * @returns {Promise<Object>} - The JSON response from the API.
 */
async function get_contacts(
  entityId = "1dc054f8-73a2-4e8d-ae10-11438dee663e",
  base,
  auth,
  options = {},
) {
  const url = `${base}/selfservice/api/energov/entity/contacts/search/search`;

  const headers = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/json;charset=UTF-8",
    origin: base,
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

  // Construct the payload using default values from the cURL,
  // allowing overrides using the options parameter
  const payload = {
    PageNumber: 1,
    PageSize: 100,
    SortField: "",
    IsSortedInAscendingOrder: true,
    ModuleId: 1,
    EntityId: entityId,
    ...options,
  };

  try {
    const response = await fetch(url, {
      method: "POST", // Implicitly POST because of --data-raw
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching contacts:", error);
    throw error;
  }
}

// Export using CommonJS
module.exports = get_contacts;
