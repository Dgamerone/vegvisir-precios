import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SPREADSHEET_ID } from "@/lib/sheets";

export const dynamic = "force-dynamic";

const norm = (v: unknown) => (v ?? "").toString().trim().toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, nombre, color, precio, password } = await req.json();

    if (password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Contraseña incorrecta" }, { status: 401 });
    }
    if (!rowIndex || !nombre || precio == null || isNaN(Number(precio))) {
      return NextResponse.json({ ok: false, error: "Datos inválidos" }, { status: 400 });
    }

    const sheets = getSheetsClient();

    // 1) Verificar que esa fila sigue siendo el mismo insumo
    const check = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `BD_Insumos!A${rowIndex}:B${rowIndex}`,
    });
    const r = check.data.values?.[0] ?? [];
    let targetRow = Number(rowIndex);

    if (!(norm(r[0]) === norm(nombre) && norm(r[1]) === norm(color))) {
      // 2) La hoja cambió: buscar el insumo por nombre + color
      const all = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "BD_Insumos!A4:B400",
      });
      const matches: number[] = [];
      (all.data.values ?? []).forEach((row, i) => {
        if (norm(row[0]) === norm(nombre) && norm(row[1]) === norm(color)) matches.push(i + 4);
      });
      if (matches.length !== 1) {
        return NextResponse.json(
          { ok: false, error: "La hoja cambió. Tocá ↻ para recargar y probá de nuevo." },
          { status: 409 }
        );
      }
      targetRow = matches[0];
    }

    const hoy = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    // 3) Guardar precio y fecha
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `BD_Insumos!F${targetRow}:G${targetRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[Number(precio), hoy]] },
    });

    // 4) Reaplicar formato (moneda en F, fecha en G). Si falla, no cancela el guardado.
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
                  range: { sheetId, startRowIndex: targetRow - 1, endRowIndex: targetRow, startColumnIndex: 5, endColumnIndex: 6 },
                  cell: { userEnteredFormat: { numberFormat: { type: "CURRENCY", pattern: "$#,##0.00" } } },
                  fields: "userEnteredFormat.numberFormat",
                },
              },
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: targetRow - 1, endRowIndex: targetRow, startColumnIndex: 6, endColumnIndex: 7 },
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

    return NextResponse.json({ ok: true, rowIndex: targetRow, precio, fecha: hoy });
  } catch (err: any) {
    console.error("POST actualizar:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Error al actualizar" },
      { status: 500 }
    );
  }
}
