import { NextResponse } from "next/server";
import { getSheetsClient, SPREADSHEET_ID, BD_RANGE } from "@/lib/sheets";

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: BD_RANGE,
    });

    const rows = res.data.values ?? [];
    // Filtrar filas vacías y headers de sección (texto en mayúsculas sin precio)
    const insumos = rows
  .map((row, idx) => ({
    rowIndex: idx + 4,
    codigo: (row[0] ?? "").toString().trim(),
    categoria: (row[1] ?? "").toString().trim(),
    nombre: (row[2] ?? "").toString().trim(),
    unidad: (row[3] ?? "").toString().trim(),
    precio: row[4] ? parseFloat(row[4].toString().replace(",", ".")) : null,
    notas: (row[5] ?? "").toString().trim(),
  }))
  .filter((r) => r.codigo && r.nombre && r.precio !== null);

    return NextResponse.json({ ok: true, insumos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Error al leer la hoja" }, { status: 500 });
  }
}
