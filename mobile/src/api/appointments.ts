import { api } from "./client";
import type { Appointment, ClinicQueue } from "./types";

export const appointmentsApi = {
  /** إرسال طلب حجز (دون رقم — تعيّنه العيادة) */
  book: (clinicId: string, day?: string) =>
    api.post<Appointment>(`/appointments/book/${clinicId}`, { day: day ?? null }),

  mine: () => api.get<Appointment[]>("/appointments/me"),
  get: (id: string) => api.get<Appointment>(`/appointments/${id}`),
  cancel: (id: string) => api.del<void>(`/appointments/${id}`),

  // ----- العيادة -----
  queue: (clinicId: string) => api.get<ClinicQueue>(`/appointments/clinic/${clinicId}/queue`),

  /** قبول طلب وتعيين رقمه (افتراضياً التالي) */
  accept: (clinicId: string, appointmentId: string, number?: number) =>
    api.post<ClinicQueue>(`/appointments/clinic/${clinicId}/accept/${appointmentId}`, { number: number ?? null }),

  reject: (clinicId: string, appointmentId: string) =>
    api.post<ClinicQueue>(`/appointments/clinic/${clinicId}/reject/${appointmentId}`, {}),

  /** ضبط «الرقم الحالي» (أو +1 إن غاب number) */
  setCurrent: (clinicId: string, number?: number) =>
    api.post<ClinicQueue>(`/appointments/clinic/${clinicId}/current`, { number: number ?? null }),
};
