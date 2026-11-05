import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SPREADSHEET_ID } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, precio, password } = await req.json();

    if (password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
    }
    if (!rowIndex || precio == null || isNaN(Number(precio))) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const hoy = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    // 1) Guardar precio y fecha
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `BD_Insumos!F${rowIndex}:G${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[Number(precio), hoy]] },
    });

    // 2) Reaplicar formato (moneda en F, fecha en G).
    //    Si falla, no se cancela el guardado.
    try {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        fields: "sheets.properties(sheetId,title)",
      });
      const sheetId = meta.data.sheets?.find(
        (s) => s.properties?.title === "BD_Insumos"
      )?.properties?.sheetId;

      if (sheetId != null) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 5, endColumnIndex: 6 },
                  cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "$#,##0.00" } } },
                  fields: "userEnteredFormat.numberFormat",
                },
              },
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: rowIndex - 1, endRowIndex: rowIndex, startColumnIndex: 6, endColumnIndex: 7 },
                  cell: { userEnteredFormat: { numberFormat: { type: "DATE", pattern: "dd/MM/yyyy" } } },
                  fields: "userEnteredFormat.numberFormat",
                },
              },
            ],
          },
        });
      }
    } catch (fmtErr: any) {
      console.error("Formato no aplicado:", fmtErr?.message);
    }

    return NextResponse.json({ ok: true, rowIndex, precio, fecha: hoy });
  } catch (err: any) {
    console.error("POST actualizar:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error al actualizar" },
      { status: 500 }
    );
  }
}
