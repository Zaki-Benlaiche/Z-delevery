import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { adminApi } from "../../api/admin";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { colors } from "../../theme";

const VEHICLE_LABEL: Record<string, string> = { moto: "دراجة نارية", car: "سيارة", bike: "دراجة" };
const dz = (n: number) => Number(n || 0).toLocaleString("fr-DZ");

export function AdminDriversPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const drivers = useQuery({ queryKey: ["admin-drivers"], queryFn: adminApi.drivers });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "online">("all");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const verify = useMutation({
    mutationFn: (id: string) => adminApi.verifyDriver(id),
    onSuccess: () => { invalidate(); toast.success("تم توثيق السائق"); },
    onError: (e) => toast.error((e as Error).message),
  });
  const unverify = useMutation({
    mutationFn: (id: string) => adminApi.unverifyDriver(id),
    onSuccess: () => { invalidate(); toast.success("تم تعطيل السائق"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const all = drivers.data ?? [];
  const totals = useMemo(
    () => ({
      online: all.filter((d) => d.is_online).length,
      pending: all.filter((d) => !d.is_verified).length,
      deliveries: all.reduce((s, d) => s + (d.deliveries || 0), 0),
      earnings: all.reduce((s, d) => s + (d.earnings || 0), 0),
    }),
    [all],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((d) => (filter === "pending" ? !d.is_verified : filter === "online" ? d.is_online : true))
      .filter((d) => !q || (d.owner_name ?? "").toLowerCase().includes(q) || (d.owner_phone ?? "").includes(q));
  }, [all, search, filter]);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">السائقون</h1>
          <p className="page-subtitle">
            {all.length} سائق · {totals.pending > 0 ? `${totals.pending} بانتظار التوثيق` : "كلّهم موثَّقون"}
          </p>
        </div>
      </header>

      <div style={styles.summary}>
        <SummaryStat label="إجمالي السائقين" value={dz(all.length)} color={colors.accent} />
        <SummaryStat label="متّصل الآن" value={dz(totals.online)} color={colors.success} />
        <SummaryStat label="إجمالي التوصيلات" value={dz(totals.deliveries)} color={colors.info} />
        <SummaryStat label="إجمالي الأرباح" value={`${dz(totals.earnings)} دج`} color={colors.primary} />
      </div>

      <div style={styles.toolbar}>
        <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
          <input
            className="input"
            placeholder="ابحث باسم السائق أو هاتفه…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.segmented}>
          {(["all", "online", "pending"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...styles.segBtn, ...(filter === f ? styles.segActive : {}) }}>
              {f === "all" ? "الكل" : f === "online" ? "متّصل" : "بانتظار"}
            </button>
          ))}
        </div>
      </div>

      {drivers.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 76 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>لا سائقين مطابقين</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((d) => (
            <div key={d.id} className="card card-hover" style={styles.row} onClick={() => navigate(`/admin/drivers/${d.id}`)}>
              <div style={styles.avatar}>
                <Icon name="drivers" size={20} />
                <span style={{ ...styles.onlineDot, background: d.is_online ? colors.success : colors.textFaint }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{d.owner_name || "سائق"}</span>
                  <span className="pill" style={{ background: colors.surface, color: colors.textMuted, fontSize: 11 }}>
                    {VEHICLE_LABEL[d.vehicle_type ?? ""] ?? d.vehicle_type ?? "مركبة"}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                  {d.owner_phone || "بلا هاتف"} · ⭐ {Number(d.rating).toFixed(1)}
                  {d.license_url ? (
                    <>
                      {" · "}
                      <a href={d.license_url} target="_blank" rel="noreferrer" style={{ color: colors.info }} onClick={(e) => e.stopPropagation()}>
                        الرخصة
                      </a>
                    </>
                  ) : null}
                </div>
              </div>

              <MiniMetric label="توصيلات" value={dz(d.deliveries)} />
              <MiniMetric label="أرباح" value={`${dz(d.earnings)} دج`} />
              <MiniMetric label="نشط" value={dz(d.active_orders)} />

              <span
                className="pill"
                style={{
                  background: d.is_verified ? colors.successSoft : colors.warningSoft,
                  color: d.is_verified ? colors.success : colors.warning,
                  fontSize: 12,
                }}
              >
                {d.is_verified ? "موثَّق" : "بانتظار"}
              </span>

              <div onClick={(e) => e.stopPropagation()}>
                {d.is_verified ? (
                  <button className="btn btn-ghost btn-sm" style={{ color: colors.danger }} onClick={() => unverify.mutate(d.id)} disabled={unverify.isPending}>
                    تعطيل
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => verify.mutate(d.id)} disabled={verify.isPending}>
                    توثيق
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summary: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 },
  toolbar: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  segmented: { display: "flex", background: colors.surface, borderRadius: 12, padding: 3, gap: 2 },
  segBtn: { padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, color: colors.textMuted },
  segActive: { background: colors.bg, color: colors.text, boxShadow: "var(--shadow-sm)" },
  row: { display: "flex", gap: 14, alignItems: "center", cursor: "pointer" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    background: colors.surface,
    display: "grid",
    placeItems: "center",
    color: colors.textMuted,
    flexShrink: 0,
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    insetInlineStart: 2,
    width: 11,
    height: 11,
    borderRadius: "50%",
    border: "2px solid #fff",
  },
};
