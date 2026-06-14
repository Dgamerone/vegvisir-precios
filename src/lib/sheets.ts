import { google } from "googleapis";

export function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
// La hoja BD_Insumos: columnas A=Insumo B=Color C=Unidad D=Cantidad E=Proveedor F=Precio G=Fecha
export const BD_RANGE = "BD_Insumos!A4:G300";
