"""مخططات المواعيد الطبية (نظام الطابور)"""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class AppointmentBookIn(BaseModel):
    day: date | None = None  # افتراضياً اليوم


class QueueInfo(BaseModel):
    now_serving: int          # الرقم الجاري خدمته (0 إن لم يبدأ بعد)
    ahead: int                # كم شخصاً أمامك
    est_wait_min: int         # دقائق الانتظار التقديرية (يحسب الموبايل وقت الحضور من ساعته)
    total_in_queue: int       # إجمالي المنتظرين اليوم


class AppointmentOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    clinic_name: str | None = None
    day: date
    queue_number: int
    status: str
    created_at: datetime
    queue: QueueInfo | None = None


# ---------- جانب الطبيب ----------
class ClinicQueueItem(BaseModel):
    id: uuid.UUID
    queue_number: int
    status: str
    patient_name: str | None = None
    created_at: datetime


class ClinicQueueOut(BaseModel):
    day: date
    now_serving: int
    waiting_count: int
    items: list[ClinicQueueItem] = Field(default_factory=list)
