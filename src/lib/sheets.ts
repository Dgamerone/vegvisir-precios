import { google } from "googleapis";

export function getSheetsClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "";
  
  let credentials;
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8");
    console.log("DECODED KEYS:", Object.keys(JSON.parse(decoded)));
    credentials = JSON.parse(decoded);
  } catch (e) {
    console.log("PARSE ERROR:", e);
    throw e;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
export const BD_RANGE = "BD_Insumos!A4:F200";
