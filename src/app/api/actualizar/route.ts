import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SPREADSHEET_ID } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const { rowIndex, precio, password } = await req.json();

    // Auth básica
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

    // Actualizar columna F (precio) y G (fecha) de esa fila
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `BD_Insumos!F${rowIndex}:G${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[Number(precio), hoy]] },
    });

    return NextResponse.json({ ok: true, rowIndex, precio, fecha: hoy });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Error al actualizar" }, { status: 500 });
  }
}
