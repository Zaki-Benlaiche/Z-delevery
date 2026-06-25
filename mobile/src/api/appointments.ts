import { api } from "./client";
import type { Appointment, ClinicQueue } from "./types";

export const appointmentsApi = {
  /** حجز موعد بنظام الطابور (افتراضياً اليوم) */
  book: (clinicId: string, day?: string) =>
    api.post<Appointment>(`/appointments/book/${clinicId}`, { day: day ?? null }),

  /** مواعيدي النشطة مع حالة الطابور الحية */
  mine: () => api.get<Appointment[]>("/appointments/me"),

  /** موعد واحد بحالة الطابور */
  get: (id: string) => api.get<Appointment>(`/appointments/${id}`),

  /** إلغاء موعد */
  cancel: (id: string) => api.del<void>(`/appointments/${id}`),

  // ----- جانب الطبيب -----
  /** طابور اليوم لعيادتي */
  queue: (clinicId: string) => api.get<ClinicQueue>(`/appointments/clinic/${clinicId}/queue`),

  /** استدعاء المريض التالي */
  next: (clinicId: string) => api.post<ClinicQueue>(`/appointments/clinic/${clinicId}/next`),
};
