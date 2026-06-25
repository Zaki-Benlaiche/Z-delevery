"""مخططات المواعيد الطبية (طلب → تعيين رقم من العيادة → متابعة)"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class AppointmentBookIn(BaseModel):
    day: date | None = None  # افتراضياً اليوم


class QueueInfo(BaseModel):
    now_serving: int          # الرقم الحالي الذي تخدمه العيادة
    ahead: int                # كم أمامك (رقمك - الرقم الحالي)
    est_wait_min: int         # دقائق الانتظار التقديرية
    total_in_queue: int       # إجمالي المنتظرين في الطابور


class AppointmentOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    clinic_name: str | None = None
    clinic_phone: str | None = None
    clinic_lat: float | None = None
    clinic_lng: float | None = None
    day: date
    queue_number: int          # 0 = لم تُعيّن العيادة رقماً بعد
    status: str                # requested | waiting | done | cancelled
    created_at: datetime
    queue: QueueInfo | None = None


# ---------- جانب الطبيب ----------
class AcceptIn(BaseModel):
    number: int | None = None  # الرقم الذي تعطيه العيادة (افتراضياً التالي)


class SetCurrentIn(BaseModel):
    number: int | None = None  # ضبط «الرقم الحالي» مباشرةً (إن غاب: +1)


class ClinicQueueItem(BaseModel):
    id: uuid.UUID
    queue_number: int
    status: str
    patient_name: str | None = None
    created_at: datetime


class ClinicQueueOut(BaseModel):
    day: date
    current_number: int                                   # الرقم الحالي (العدّاد)
    requests: list[ClinicQueueItem] = Field(default_factory=list)  # طلبات بانتظار تعيين رقم
    waiting: list[ClinicQueueItem] = Field(default_factory=list)   # في الطابور (رقم مُعيَّن)
