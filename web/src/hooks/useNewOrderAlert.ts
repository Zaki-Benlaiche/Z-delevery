/** يكشف الطلبات الجديدة في كلّ refetch ويُصدر صوتاً + إشعار متصفّح.
 *
 * تصميم بدون أيّ asset:
 * - الصوت: Web Audio API (نغمة قصيرة من oscillator)
 * - الإشعار: Notification API الأصلية (نطلب الإذن مرّة واحدة)
 *
 * المرّة الأولى التي يُحمَّل فيها الـ hook لا تُصدر تنبيهاً (تُسجّل المعرّفات الحالية كقاعدة).
 */
import { useEffect, useRef } from "react";

import type { Order } from "../api/types";

export function useNewOrderAlert(orders: Order[] | undefined) {
  const seenIds = useRef<Set<string> | null>(null);

  // طلب إذن الإشعار مرّة واحدة عند التحميل
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!orders) return;

    const currentIds = new Set(orders.map((o) => o.id));

    // أوّل دورة: نسجّل ما هو موجود ونصمت
    if (seenIds.current === null) {
      seenIds.current = currentIds;
      return;
    }

    // نحسب المعرّفات التي ظهرت ولم تكن سابقاً + حالتها pending فقط
    const newlyPending = orders.filter(
      (o) => !seenIds.current!.has(o.id) && o.status === "pending",
    );

    if (newlyPending.length > 0) {
      playBeep();
      showNotification(newlyPending.length);
    }

    seenIds.current = currentIds;
  }, [orders]);
}

function playBeep(): void {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.value = 880; // A5
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    // نغمة ثانية أعلى بدرجة لتسهيل التمييز عن أصوات النظام
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2).connect(ctx.destination);
      osc2.frequency.value = 1320; // E6
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.4);
    }, 200);
  } catch {
    // لا يدعم المتصفّح Web Audio — نتجاهل
  }
}

function showNotification(count: number): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted")
    return;
  try {
    new Notification("طلب جديد · Rserve-Vite", {
      body: count === 1 ? "وصلك طلب جديد!" : `وصلتك ${count} طلبات جديدة!`,
      icon: "/favicon.png",
      tag: "z-new-order",
    });
  } catch {
    // قد يُمنَع الإشعار في بعض الحالات — نتجاهل
  }
}
