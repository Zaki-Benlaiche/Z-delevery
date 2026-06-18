import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi, type AdminDriver } from "../../api/admin";
import { useToast } from "../../components/Toast";
import { colors } from "../../theme";

export function AdminDriversPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const drivers = useQuery({ queryKey: ["admin-drivers"], queryFn: adminApi.drivers });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const verify = useMutation({
    mutationFn: (id: string) => adminApi.verifyDriver(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم توثيق السائق");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const unverify = useMutation({
    mutationFn: (id: string) => adminApi.unverifyDriver(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم تعطيل السائق");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = drivers.data ?? [];
  const pending = rows.filter((d) => !d.is_verified);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>السائقون ({rows.length})</h1>
      <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>
        {pending.length > 0 ? `${pending.length} بانتظار التوثيق` : "كلّ السائقين موثَّقون"}
      </p>

      {drivers.isLoading ? (
        <div className="muted">...جاري التحميل</div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>لا سائقين بعد</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((d) => (
            <DriverRow
              key={d.id}
              driver={d}
              onVerify={() => verify.mutate(d.id)}
              onUnverify={() => unverify.mutate(d.id)}
              busy={verify.isPending || unverify.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DriverRow({
  driver: d,
  onVerify,
  onUnverify,
  busy,
}: {
  driver: AdminDriver;
  onVerify: () => void;
  onUnverify: () => void;
  busy: boolean;
}) {
  return (
    <div className="card" style={styles.row}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{d.vehicle_type || "مركبة غير محدّدة"}</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          ⭐ {Number(d.rating).toFixed(1)} · {d.is_online ? "🟢 متصل" : "⚫ غير متصل"}
          {d.license_url ? (
            <>
              {" · "}
              <a href={d.license_url} target="_blank" rel="noreferrer" style={{ color: colors.info }}>
                الرخصة
              </a>
            </>
          ) : null}
        </div>
      </div>
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
      {d.is_verified ? (
        <button className="btn btn-ghost" style={{ color: colors.danger }} onClick={onUnverify} disabled={busy}>
          تعطيل
        </button>
      ) : (
        <button className="btn btn-primary" onClick={onVerify} disabled={busy}>
          توثيق
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", gap: 12, alignItems: "center" },
};
