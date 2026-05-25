import { useState } from "react";

import { authApi } from "../api/auth";
import { useAuth } from "../auth/context";
import { colors } from "../theme";

type Step = "phone" | "otp";

export function LoginPage() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setError(null);
    if (phone.length < 9) return setError("رقم الهاتف غير صالح");
    setLoading(true);
    try {
      const res = await authApi.sendOtp(phone);
      setDevOtp(res.dev_otp);
      if (res.dev_otp) setCode(res.dev_otp);
      setStep("otp");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError(null);
    if (code.length < 4) return setError("الرمز قصير");
    setLoading(true);
    try {
      // الويب موجّه أساساً للتجّار — الدور المُمرَّر للحساب الجديد هو merchant
      await signIn(phone, code, name || undefined, "merchant");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={styles.brand}>Z-delivry · لوحة التاجر</h1>
        <p style={styles.tag}>أدر متجرك واستقبل الطلبات</p>

        {step === "phone" ? (
          <>
            <div className="field" style={{ marginTop: 24 }}>
              <label>رقم الهاتف</label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0555 12 34 56"
                maxLength={15}
                disabled={loading}
              />
            </div>
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? "..." : "إرسال الرمز"}
            </button>
          </>
        ) : (
          <>
            <div className="field" style={{ marginTop: 24 }}>
              <label>الرمز المرسَل إلى {phone}</label>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="0000"
                maxLength={6}
                disabled={loading}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>اسمك (للحساب الجديد فقط)</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم صاحب المتجر"
                disabled={loading}
              />
            </div>
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            {devOtp && (
              <div style={{ marginTop: 8, fontSize: 12, color: colors.warning }}>
                وضع التطوير: الرمز معبّأ تلقائياً ({devOtp})
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={verify}
              disabled={loading}
            >
              {loading ? "..." : "تأكيد ودخول"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: "100%", marginTop: 6 }}
              onClick={() => setStep("phone")}
            >
              تغيير الرقم
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: colors.surface,
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: colors.bg,
    padding: 32,
    borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  brand: { color: colors.primary, fontSize: 24, fontWeight: 800 },
  tag: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
};
