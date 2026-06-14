"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Insumo = {
  rowIndex: number;
  nombre: string;
  color: string;
  unidad: string;
  cantidad: string;
  proveedor: string;
  precio: number | null;
  fechaActualizacion: string;
};

type SaveState = "idle" | "saving" | "ok" | "error";

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIAS: Record<string, string[]> = {
  "Cintas": ["Cinta"],
  "Telas": ["Tela", "Doble Frontura", "Goma Epuma", "Polex", "Aislante"],
  "Hebillas": ["Hebilla", "Regulador", "Pasador", "Tanca", "Medialuna", "Argolla", "Dado", "Mosqueton"],
  "Elásticos": ["Elastico"],
  "Avíos": ["Etiqueta", "Logo", "Hilo", "Hilos", "Iman", "Broche"],
  "Otros": [],
};

function getCategoria(nombre: string): string {
  for (const [cat, keywords] of Object.entries(CATEGORIAS)) {
    if (cat === "Otros") continue;
    if (keywords.some((k) => nombre.toLowerCase().includes(k.toLowerCase()))) return cat;
  }
  return "Otros";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatARS(n: number | null) {
  if (n == null) return null;
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function diasDesde(fechaStr: string): number | null {
  if (!fechaStr) return null;
  const parts = fechaStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const date = new Date(`${y}-${m}-${d}`);
  if (isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

// ─── Styles (object literals for no-build simplicity) ────────────────────────
const S = {
  app: { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#111" } as React.CSSProperties,

  // Login
  loginWrap: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", gap: "1.5rem" },
  loginLogo: { fontSize: 36, fontWeight: 700, color: "#FF6B2B", letterSpacing: -1 },
  loginSub: { fontSize: 13, color: "#666", marginTop: -12 },
  loginInput: { width: "100%", maxWidth: 320, padding: "14px 16px", background: "#1e1e1e", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 16, outline: "none" },
  loginBtn: { width: "100%", maxWidth: 320, padding: "14px 0", background: "#FF6B2B", border: "none", borderRadius: 12, color: "#111", fontWeight: 700, fontSize: 16, cursor: "pointer" },

  // Header
  header: { background: "#1a1a1a", padding: "14px 16px 0", position: "sticky" as const, top: 0, zIndex: 10 },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  logo: { fontSize: 17, fontWeight: 700, color: "#FF6B2B" },
  logoutBtn: { background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer" },
  searchWrap: { position: "relative" as const, marginBottom: 0 },
  searchInput: { width: "100%", padding: "10px 12px 10px 38px", background: "#2a2a2a", border: "1px solid #333", borderRadius: 10, color: "#fff", fontSize: 15, outline: "none" },
  searchIcon: { position: "absolute" as const, left: 12, top: "50%", transform: "translateY(-50%)", color: "#555", fontSize: 16, pointerEvents: "none" as const },

  // Filter chips
  chips: { display: "flex", gap: 6, overflowX: "auto" as const, padding: "10px 16px", background: "#1a1a1a", borderBottom: "1px solid #222", scrollbarWidth: "none" as const },
  chip: (active: boolean) => ({
    flexShrink: 0, padding: "5px 13px", borderRadius: 20,
    border: active ? "none" : "1px solid #333",
    background: active ? "#FF6B2B" : "transparent",
    color: active ? "#111" : "#888", fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
  } as React.CSSProperties),

  // Stats
  stats: { display: "flex", background: "#1a1a1a", borderBottom: "1px solid #222" },
  stat: { flex: 1, textAlign: "center" as const, padding: "8px 4px" },
  statN: { fontSize: 15, fontWeight: 600, color: "#FF6B2B" },
  statL: { fontSize: 10, color: "#555", marginTop: 1 },

  // List
  list: { paddingBottom: 100 },
  secHeader: { padding: "8px 16px 5px", fontSize: 10, fontWeight: 600, color: "#555", textTransform: "uppercase" as const, letterSpacing: "0.8px", background: "#161616", borderBottom: "1px solid #1e1e1e" },
  item: { display: "flex", alignItems: "center", padding: "13px 16px", borderBottom: "1px solid #1e1e1e", gap: 10, cursor: "pointer", WebkitTapHighlightColor: "transparent" } as React.CSSProperties,
  dot: (hasPrice: boolean) => ({ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: hasPrice ? "#00A878" : "#333" } as React.CSSProperties),
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontSize: 14, color: "#e8e8e8", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  itemMeta: { fontSize: 11, color: "#555", marginTop: 2 },
  itemRight: { textAlign: "right" as const, flexShrink: 0 },
  itemPrice: { fontSize: 14, fontWeight: 600, color: "#FF6B2B" },
  itemNoPrice: { fontSize: 12, color: "#444" },
  itemUnit: { fontSize: 10, color: "#444" },
  itemStale: { fontSize: 10, color: "#a05020", marginTop: 1 },

  // Empty
  empty: { padding: "60px 24px", textAlign: "center" as const, color: "#444" },

  // Modal overlay
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "flex-end" as const },
  modal: { background: "#1e1e1e", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 480, margin: "0 auto" },
  modalHandle: { width: 36, height: 4, background: "#333", borderRadius: 2, margin: "0 auto 18px" },
  modalTitle: { fontSize: 16, fontWeight: 600, color: "#e8e8e8", marginBottom: 4 },
  modalSub: { fontSize: 12, color: "#666", marginBottom: 18 },
  label: { fontSize: 12, color: "#888", marginBottom: 6, display: "block" as const },
  priceInput: { width: "100%", padding: "14px 16px", background: "#2a2a2a", border: "1px solid #444", borderRadius: 12, color: "#fff", fontSize: 20, fontWeight: 600, outline: "none", marginBottom: 8 } as React.CSSProperties,
  prevPrice: { fontSize: 12, color: "#555", marginBottom: 18 },
  btnRow: { display: "flex", gap: 10, marginTop: 4 },
  btnCancel: { flex: 1, padding: 13, borderRadius: 12, border: "1px solid #333", background: "transparent", color: "#888", fontSize: 14, cursor: "pointer" },
  btnSave: (disabled: boolean) => ({ flex: 2, padding: 13, borderRadius: 12, border: "none", background: disabled ? "#333" : "#FF6B2B", color: disabled ? "#555" : "#111", fontWeight: 700, fontSize: 15, cursor: disabled ? "default" : "pointer" } as React.CSSProperties),
  modalInfo: { marginBottom: 16, padding: "10px 12px", background: "#252525", borderRadius: 10, fontSize: 12, color: "#777", lineHeight: 1.6 },

  // Toast
  toast: (show: boolean, type: "ok"|"error") => ({
    position: "fixed" as const, bottom: 28, left: "50%", transform: "translateX(-50%)",
    background: type === "ok" ? "#00A878" : "#E63946",
    color: "#fff", padding: "10px 22px", borderRadius: 24, fontSize: 13, fontWeight: 500,
    opacity: show ? 1 : 0, transition: "opacity 0.25s", zIndex: 100, whiteSpace: "nowrap" as const,
    pointerEvents: "none" as const,
  }),

  // Loading
  loading: { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, color: "#555" },
  spinner: { width: 32, height: 32, border: "3px solid #222", borderTop: "3px solid #FF6B2B", borderRadius: "50%", animation: "spin 0.8s linear infinite" } as React.CSSProperties,
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState(false);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [catActiva, setCatActiva] = useState("Todos");

  const [selected, setSelected] = useState<Insumo | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const [toast, setToast] = useState<{ msg: string; type: "ok"|"error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Check if previously authed in session
  useEffect(() => {
    const p = sessionStorage.getItem("vv_pwd");
    if (p) { setAuthed(true); setPwd(p); }
  }, []);

  const showToast = (msg: string, type: "ok"|"error") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const login = () => {
    // Client-side check — server validates on every request
    if (pwd.trim().length < 3) { setPwdErr(true); return; }
    sessionStorage.setItem("vv_pwd", pwd);
    setAuthed(true);
    setPwdErr(false);
  };

  const fetchInsumos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/insumos");
      const data = await res.json();
      if (data.ok) setInsumos(data.insumos);
      else showToast("Error al cargar insumos", "error");
    } catch {
      showToast("Sin conexión", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) fetchInsumos(); }, [authed, fetchInsumos]);

  const handleSave = async () => {
    if (!selected || !newPrice) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex: selected.rowIndex, precio: Number(newPrice), password: pwd }),
      });
      const data = await res.json();
      if (data.ok) {
        setInsumos((prev) =>
          prev.map((ins) =>
            ins.rowIndex === selected.rowIndex
              ? { ...ins, precio: Number(newPrice), fechaActualizacion: data.fecha }
              : ins
          )
        );
        setSaveState("ok");
        showToast(`✓ ${selected.nombre} actualizado`, "ok");
        setTimeout(() => { setSelected(null); setSaveState("idle"); setNewPrice(""); }, 600);
      } else {
        setSaveState("error");
        showToast(data.error || "Error al guardar", "error");
        setTimeout(() => setSaveState("idle"), 1500);
      }
    } catch {
      setSaveState("error");
      showToast("Sin conexión", "error");
      setTimeout(() => setSaveState("idle"), 1500);
    }
  };

  // Filtered + grouped
  const filtered = insumos.filter((ins) => {
    const q = search.toLowerCase();
    const matchQ = !q || ins.nombre.toLowerCase().includes(q) || ins.color.toLowerCase().includes(q) || ins.proveedor.toLowerCase().includes(q);
    const matchCat = catActiva === "Todos" || catActiva === "Sin precio"
      ? (catActiva === "Todos" || ins.precio == null)
      : getCategoria(ins.nombre) === catActiva;
    return matchQ && matchCat;
  });

  const grouped: Record<string, Insumo[]> = {};
  filtered.forEach((ins) => {
    const cat = getCategoria(ins.nombre);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ins);
  });

  const sinPrecio = insumos.filter((i) => i.precio == null).length;
  const conPrecio = insumos.filter((i) => i.precio != null).length;
  const categorias = ["Todos", "Sin precio", ...Object.keys(CATEGORIAS)];

  // ── LOGIN ──
  if (!authed) {
    return (
      <div style={S.app}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={S.loginWrap}>
          <div>
            <div style={S.loginLogo}>⚡ VEGVISIR</div>
            <div style={S.loginSub}>Actualizador de precios</div>
          </div>
          <input
            style={{ ...S.loginInput, borderColor: pwdErr ? "#E63946" : "#333" }}
            type="password"
            placeholder="Contraseña"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setPwdErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && login()}
            autoFocus
          />
          {pwdErr && <div style={{ fontSize: 12, color: "#E63946", marginTop: -16 }}>Ingresá la contraseña</div>}
          <button style={S.loginBtn} onClick={login}>Entrar</button>
        </div>
      </div>
    );
  }

  // ── APP ──
  return (
    <div style={S.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=search]::-webkit-search-cancel-button { display: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={S.logo}>⚡ VEGVISIR</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }} onClick={fetchInsumos} title="Actualizar">↻</button>
            <button style={S.logoutBtn} onClick={() => { sessionStorage.removeItem("vv_pwd"); setAuthed(false); setInsumos([]); }}>Salir</button>
          </div>
        </div>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={S.searchInput}
            type="search"
            placeholder="Buscar insumo, color, proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div style={S.chips}>
        {categorias.map((cat) => (
          <button key={cat} style={S.chip(cat === catActiva)} onClick={() => setCatActiva(cat)}>{cat}</button>
        ))}
      </div>

      {/* Stats bar */}
      <div style={S.stats}>
        <div style={S.stat}><div style={S.statN}>{insumos.length}</div><div style={S.statL}>insumos</div></div>
        <div style={S.stat}><div style={S.statN}>{conPrecio}</div><div style={S.statL}>con precio</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: sinPrecio > 0 ? "#E63946" : "#00A878" }}>{sinPrecio}</div><div style={S.statL}>sin precio</div></div>
        <div style={S.stat}><div style={{ ...S.statN, color: "#888" }}>{filtered.length}</div><div style={S.statL}>visible</div></div>
      </div>

      {/* List */}
      <div style={S.list}>
        {loading ? (
          <div style={S.loading}>
            <div style={S.spinner} />
            <span>Cargando insumos...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div>Sin resultados para "<strong>{search}</strong>"</div>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div style={S.secHeader}>{cat} · {items.length}</div>
              {items.map((ins) => {
                const dias = diasDesde(ins.fechaActualizacion);
                const stale = dias != null && dias > 30;
                return (
                  <div key={ins.rowIndex} style={S.item} onClick={() => { setSelected(ins); setNewPrice(ins.precio?.toString() ?? ""); setSaveState("idle"); }}>
                    <div style={S.dot(ins.precio != null)} />
                    <div style={S.itemInfo}>
                      <div style={S.itemName}>{ins.nombre}</div>
                      <div style={S.itemMeta}>{ins.color}{ins.proveedor ? ` · ${ins.proveedor}` : ""}</div>
                      {stale && <div style={S.itemStale}>⚠ hace {dias} días sin actualizar</div>}
                    </div>
                    <div style={S.itemRight}>
                      {ins.precio != null
                        ? <><div style={S.itemPrice}>{formatARS(ins.precio)}</div><div style={S.itemUnit}>/ {ins.unidad}</div></>
                        : <div style={S.itemNoPrice}>Sin precio</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setNewPrice(""); } }}>
          <div style={S.modal}>
            <div style={S.modalHandle} />
            <div style={S.modalTitle}>{selected.nombre}</div>
            <div style={S.modalSub}>{selected.color} · {selected.unidad}</div>
            <div style={S.modalInfo}>
              {selected.proveedor && <><strong style={{ color: "#888" }}>Proveedor:</strong> {selected.proveedor}<br /></>}
              {selected.fechaActualizacion && <><strong style={{ color: "#888" }}>Última actualización:</strong> {selected.fechaActualizacion}</>}
            </div>
            <label style={S.label}>Nuevo precio (ARS por {selected.unidad.toLowerCase()})</label>
            <input
              style={S.priceInput}
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            {selected.precio != null && (
              <div style={S.prevPrice}>Precio actual: {formatARS(selected.precio)}</div>
            )}
            <div style={S.btnRow}>
              <button style={S.btnCancel} onClick={() => { setSelected(null); setNewPrice(""); }}>Cancelar</button>
              <button
                style={S.btnSave(saveState === "saving" || !newPrice)}
                onClick={handleSave}
                disabled={saveState === "saving" || !newPrice}
              >
                {saveState === "saving" ? "Guardando..." : saveState === "ok" ? "✓ Guardado" : "Guardar precio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div style={S.toast(true, toast.type)}>{toast.msg}</div>}
    </div>
  );
}
