const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();

const email = process.env.TYLER_EMAIL;
const pass = process.env.TYLER_PASSWORD;

if (!email || !pass) {
  console.log("Email / Password Required");
  process.exit(1);
}

// Helper function to create artificial delays
const delay = (time) => new Promise((resolve) => setTimeout(resolve, time));

async function getToken() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Helps prevent memory issues in CI
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  );

  // 1. Catch tokens being sent in API Headers (Bearer Token)
  page.on("request", (request) => {
    const headers = request.headers();
    const authHeader = headers["authorization"] || headers["Authorization"];

    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.substring(7); // Remove 'Bearer '
      console.log(
        "\n🚀 [SUCCESS] JWT intercepted from an outgoing API request header!",
      );
      console.log("TOKEN:", token.substring(0, 50) + "... [TRUNCATED]");
      fs.writeFileSync("token", token);
    }
  });

  try {
    console.log("Navigating to the initial URL...");
    await page.goto(
      "https://etrac.savannahga.gov/energov_prod/selfservice#/sso.html",
      {
        waitUntil: "networkidle2",
      },
    );

    // 1. POPUP
    console.log("Waiting for the popup to appear...");
    const continueBtnSelector = "#modalOkBtn";
    await page.waitForSelector(continueBtnSelector, {
      visible: true,
      timeout: 15000,
    });

    await delay(1000);
    console.log('Clicking "Continue" on the popup...');
    await page.click(continueBtnSelector);

    // 2. EMAIL INPUT
    console.log("Waiting for redirect to SSO page and email input field...");
    const emailInputSelector = "#identifier";
    await page.waitForSelector(emailInputSelector, {
      visible: true,
      timeout: 60000,
    });

    await delay(1500);
    console.log("Typing email address...");
    await page.type(emailInputSelector, email, { delay: 100 });

    // 3. NEXT BUTTON
    await delay(1000);
    console.log("Clicking the Next button...");
    const nextButtonSelector = 'button[data-se="save"]';
    await page.waitForSelector(nextButtonSelector, { visible: true });
    await page.click(nextButtonSelector);

    // 4. SELECT PASSWORD OPTION
    console.log('Waiting for the "Select Password" option...');
    const passwordOptionSelector = 'button[aria-label="Select Password."]';
    await page.waitForSelector(passwordOptionSelector, {
      visible: true,
      timeout: 15000,
    });

    await delay(1500);
    console.log('Clicking "Select Password"...');
    await page.click(passwordOptionSelector);

    // 5. PASSWORD INPUT
    console.log("Waiting for the password input box...");
    const passwordInputSelector = 'input[name="credentials.passcode"]';
    await page.waitForSelector(passwordInputSelector, {
      visible: true,
      timeout: 15000,
    });

    await delay(1500);
    console.log("Typing password...");
    await page.type(passwordInputSelector, pass, {
      delay: 100,
    });

    // 6. VERIFY BUTTON
    await delay(1000);
    console.log("Clicking Verify...");
    const verifyButtonSelector = 'button[data-se="save"]';
    await page.waitForSelector(verifyButtonSelector, { visible: true });
    await page.click(verifyButtonSelector);

    console.log(
      "Boom! Verification submitted. Waiting for redirect back to main site...",
    );

    // Wait for the login to process and redirect back to the application
    // During this time, the network listeners above will catch the tokens!
    await delay(10000);
  } catch (error) {
    console.error("An error occurred during the automation:", error);
  } finally {
    console.log("\nClosing browser...");
    await browser.close();
  }
}

module.exports = { getToken };
