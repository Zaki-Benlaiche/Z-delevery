"""مسارات المواعيد الطبية — نظام طابور رقمي للعيادات (clinic)"""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.geo import read_point
from app.models.appointment import Appointment
from app.models.enums import AppointmentStatus, UserRole
from app.models.merchant import Merchant
from app.models.user import User
from app.services.notifications import fire_and_forget, send_push
from app.schemas.appointment import (
    AppointmentBookIn,
    AppointmentOut,
    ClinicQueueItem,
    ClinicQueueOut,
    QueueInfo,
)

router = APIRouter(prefix="/appointments", tags=["المواعيد الطبية"])

# متوسّط مدّة الكشف (دقائق) — لتقدير وقت الانتظار. قابل للتخصيص لاحقاً لكل عيادة.
AVG_MINUTES = 15

_ACTIVE = [AppointmentStatus.WAITING.value, AppointmentStatus.SERVING.value]


async def _clinic_or_404(clinic_id: uuid.UUID, db: AsyncSession) -> Merchant:
    m = await db.get(Merchant, clinic_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "العيادة غير موجودة")
    return m


async def _owned_clinic(clinic_id: uuid.UUID, user: User, db: AsyncSession) -> Merchant:
    m = await _clinic_or_404(clinic_id, db)
    if m.user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "لا تملك هذه العيادة")
    return m


async def _now_serving(clinic_id: uuid.UUID, day: date, db: AsyncSession) -> int:
    """أعلى رقم بدأ أو انتهى = الرقم الجاري عرضه للمرضى."""
    n = await db.scalar(
        select(func.max(Appointment.queue_number)).where(
            Appointment.clinic_id == clinic_id,
            Appointment.day == day,
            Appointment.status.in_([AppointmentStatus.SERVING.value, AppointmentStatus.DONE.value]),
        )
    )
    return int(n or 0)


async def _queue_info(appt: Appointment, db: AsyncSession) -> QueueInfo:
    now_serving = await _now_serving(appt.clinic_id, appt.day, db)
    total = await db.scalar(
        select(func.count()).select_from(Appointment).where(
            Appointment.clinic_id == appt.clinic_id,
            Appointment.day == appt.day,
            Appointment.status.in_(_ACTIVE),
        )
    ) or 0
    if appt.status == AppointmentStatus.WAITING.value:
        ahead = await db.scalar(
            select(func.count()).select_from(Appointment).where(
                Appointment.clinic_id == appt.clinic_id,
                Appointment.day == appt.day,
                Appointment.status.in_(_ACTIVE),
                Appointment.queue_number < appt.queue_number,
            )
        ) or 0
    else:
        ahead = 0
    return QueueInfo(
        now_serving=now_serving,
        ahead=int(ahead),
        est_wait_min=int(ahead) * AVG_MINUTES,
        total_in_queue=int(total),
    )


async def _to_out(appt: Appointment, db: AsyncSession, *, with_queue: bool = True) -> AppointmentOut:
    clinic = await db.get(Merchant, appt.clinic_id)
    owner = await db.get(User, clinic.user_id) if clinic else None
    coords = read_point(clinic.location) if clinic else None
    return AppointmentOut(
        id=appt.id,
        clinic_id=appt.clinic_id,
        clinic_name=clinic.name if clinic else None,
        clinic_phone=owner.phone if owner else None,
        clinic_lat=coords[0] if coords else None,
        clinic_lng=coords[1] if coords else None,
        day=appt.day,
        queue_number=appt.queue_number,
        status=appt.status,
        created_at=appt.created_at,
        queue=(await _queue_info(appt, db)) if with_queue else None,
    )


# ---------- الزبون (المريض) ----------
@router.post("/book/{clinic_id}", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def book(
    clinic_id: uuid.UUID,
    body: AppointmentBookIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """حجز موعد بنظام الطابور — يُسنَد الرقم التالي لليوم المطلوب."""
    await _clinic_or_404(clinic_id, db)
    day = body.day or date.today()

    # منع الحجز المزدوج لنفس المريض في نفس العيادة واليوم (نعيد الموجود)
    existing = (await db.execute(
        select(Appointment).where(
            Appointment.clinic_id == clinic_id,
            Appointment.customer_id == user.id,
            Appointment.day == day,
            Appointment.status.in_(_ACTIVE),
        )
    )).scalar_one_or_none()
    if existing:
        return await _to_out(existing, db)

    max_num = await db.scalar(
        select(func.max(Appointment.queue_number)).where(
            Appointment.clinic_id == clinic_id, Appointment.day == day
        )
    )
    appt = Appointment(
        clinic_id=clinic_id,
        customer_id=user.id,
        day=day,
        queue_number=int(max_num or 0) + 1,
        status=AppointmentStatus.WAITING.value,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return await _to_out(appt, db)


@router.get("/me", response_model=list[AppointmentOut])
async def my_appointments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """مواعيدي النشطة (الأحدث أولاً)."""
    rows = (await db.execute(
        select(Appointment)
        .where(Appointment.customer_id == user.id, Appointment.status.in_(_ACTIVE))
        .order_by(Appointment.day.desc(), Appointment.created_at.desc())
    )).scalars().all()
    return [await _to_out(a, db) for a in rows]


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الموعد غير موجود")
    return await _to_out(appt, db)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.customer_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الموعد غير موجود")
    appt.status = AppointmentStatus.CANCELLED.value
    await db.commit()


# ---------- الطبيب (مالك العيادة) ----------
@router.get("/clinic/{clinic_id}/queue", response_model=ClinicQueueOut)
async def clinic_queue(
    clinic_id: uuid.UUID,
    day: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """طابور اليوم للعيادة (لمالكها)."""
    await _owned_clinic(clinic_id, user, db)
    d = day or date.today()
    rows = (await db.execute(
        select(Appointment, User.name)
        .join(User, User.id == Appointment.customer_id)
        .where(Appointment.clinic_id == clinic_id, Appointment.day == d)
        .order_by(Appointment.queue_number)
    )).all()
    items = [
        ClinicQueueItem(
            id=a.id, queue_number=a.queue_number, status=a.status,
            patient_name=name, created_at=a.created_at,
        )
        for a, name in rows
    ]
    waiting = sum(1 for it in items if it.status == AppointmentStatus.WAITING.value)
    return ClinicQueueOut(day=d, now_serving=await _now_serving(clinic_id, d, db), waiting_count=waiting, items=items)


@router.post("/clinic/{clinic_id}/next", response_model=ClinicQueueOut)
async def call_next(
    clinic_id: uuid.UUID,
    day: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """استدعاء المريض التالي: إنهاء الجاري وبدء التالي في الطابور."""
    await _owned_clinic(clinic_id, user, db)
    d = day or date.today()

    serving = (await db.execute(
        select(Appointment).where(
            Appointment.clinic_id == clinic_id, Appointment.day == d,
            Appointment.status == AppointmentStatus.SERVING.value,
        )
    )).scalars().all()
    for a in serving:
        a.status = AppointmentStatus.DONE.value

    nxt = (await db.execute(
        select(Appointment).where(
            Appointment.clinic_id == clinic_id, Appointment.day == d,
            Appointment.status == AppointmentStatus.WAITING.value,
        ).order_by(Appointment.queue_number).limit(1)
    )).scalar_one_or_none()
    if nxt:
        nxt.status = AppointmentStatus.SERVING.value
    await db.commit()

    await _notify_near_turn(clinic_id, d, nxt, db)
    return await clinic_queue(clinic_id, d, db, user)


async def _notify_near_turn(clinic_id: uuid.UUID, day: date, serving: Appointment | None, db: AsyncSession) -> None:
    """إشعار push: من حان دوره، ومن اقترب دوره (أوّل منتظِرَين)."""
    clinic = await db.get(Merchant, clinic_id)
    cname = clinic.name if clinic else "العيادة"

    async def push(appt: Appointment, title: str, body: str) -> None:
        u = await db.get(User, appt.customer_id)
        if u and u.expo_push_token:
            fire_and_forget(send_push(
                u.expo_push_token, title, body,
                data={"appointment_id": str(appt.id), "screen": "MyTurn"},
            ))

    if serving is not None:
        await push(serving, "🩺 حان دورك الآن", f"توجّه إلى {cname} — أنت التالي على الطبيب")

    # أوّل منتظِرَين بعد الجاري → "اقترب دورك"
    waiting = (await db.execute(
        select(Appointment).where(
            Appointment.clinic_id == clinic_id, Appointment.day == day,
            Appointment.status == AppointmentStatus.WAITING.value,
        ).order_by(Appointment.queue_number).limit(2)
    )).scalars().all()
    for idx, appt in enumerate(waiting):
        ahead = idx + 1  # أمامه الجاري (+ من قبله)
        msg = "أنت التالي! استعدّ للدخول" if ahead == 1 else f"اقترب دورك — بقي {ahead} أمامك"
        await push(appt, f"⏳ {cname}", msg)
