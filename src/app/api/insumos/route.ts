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
    nombre: (row[0] ?? "").toString().trim(),
    unidad: (row[2] ?? "").toString().trim(),
    precio: row[5] ? parseFloat(row[5].toString().replace(",", ".").replace(/[^0-9.]/g, "")) : null,
    notas: (row[6] ?? "").toString().trim(),
  }))
  .filter((r) => r.nombre && r.nombre !== r.nombre.toUpperCase() && r.unidad);

    return NextResponse.json({ ok: true, insumos });
  } catch (err: any) {
    console.error("ERROR COMPLETO:", err?.message, err?.code, err?.status);
    return NextResponse.json(
      { ok: false, error: "Error al leer la hoja", detail: err?.message },
      { status: 500 }
    );
  }
