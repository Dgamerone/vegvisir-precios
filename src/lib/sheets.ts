import { google } from "googleapis";

export function getSheetsClient() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  
  // Limpia comillas externas si las hay y convierte \n literales
  const privateKey = rawKey
    .replace(/^"(.*)"$/, "$1")
    .replace(/\\n/g, "\n");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
export const BD_RANGE = "BD_Insumos!A4:F200";
