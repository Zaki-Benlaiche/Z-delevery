"""مسارات المواعيد الطبية — طلب من المريض، تُعيّن العيادة الرقم وتتحكّم بالرقم الحالي."""
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
from app.schemas.appointment import (
    AcceptIn,
    AppointmentBookIn,
    AppointmentOut,
    ClinicQueueItem,
    ClinicQueueOut,
    QueueInfo,
    SetCurrentIn,
)
from app.services.notifications import fire_and_forget, send_push

router = APIRouter(prefix="/appointments", tags=["المواعيد الطبية"])

AVG_MINUTES = 15
_ACTIVE = [AppointmentStatus.REQUESTED.value, AppointmentStatus.WAITING.value]


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


async def _queue_info(appt: Appointment, clinic: Merchant, db: AsyncSession) -> QueueInfo:
    current = int(clinic.current_number or 0)
    total = await db.scalar(
        select(func.count()).select_from(Appointment).where(
            Appointment.clinic_id == appt.clinic_id,
            Appointment.day == appt.day,
            Appointment.status == AppointmentStatus.WAITING.value,
        )
    ) or 0
    # أمامك = رقمك - الرقم الحالي (على مقياس أرقام العيادة الفعلي، يشمل الحضور)
    ahead = max(0, appt.queue_number - current) if appt.queue_number > 0 else 0
    return QueueInfo(
        now_serving=current,
        ahead=ahead,
        est_wait_min=ahead * AVG_MINUTES,
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
        queue=(await _queue_info(appt, clinic, db)) if (with_queue and clinic) else None,
    )


def _push(appt: Appointment, db: AsyncSession, title: str, body: str) -> None:
    async def go():
        u = await db.get(User, appt.customer_id)
        if u and u.expo_push_token:
            await send_push(u.expo_push_token, title, body,
                            data={"appointment_id": str(appt.id), "screen": "MyTurn"})
    fire_and_forget(go())


# ---------- المريض ----------
@router.post("/book/{clinic_id}", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def book(
    clinic_id: uuid.UUID,
    body: AppointmentBookIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """إرسال طلب حجز — دون رقم؛ تُعيّن العيادة الرقم لاحقاً."""
    await _clinic_or_404(clinic_id, db)
    day = body.day or date.today()

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

    appt = Appointment(
        clinic_id=clinic_id,
        customer_id=user.id,
        day=day,
        queue_number=0,
        status=AppointmentStatus.REQUESTED.value,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)

    # إخطار العيادة بطلب جديد
    clinic = await db.get(Merchant, clinic_id)
    if clinic:
        owner = await db.get(User, clinic.user_id)
        if owner and owner.expo_push_token:
            patient = await db.get(User, user.id)
            fire_and_forget(send_push(
                owner.expo_push_token, "🩺 طلب موعد جديد",
                f"طلب حجز من {patient.name or 'مريض'} — عيّن له رقماً",
                data={"screen": "ClinicQueue"},
            ))
    return await _to_out(appt, db)


@router.get("/me", response_model=list[AppointmentOut])
async def my_appointments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
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


# ---------- العيادة (الطبيب/الاستقبال) ----------
async def _clinic_queue_out(clinic: Merchant, day: date, db: AsyncSession) -> ClinicQueueOut:
    rows = (await db.execute(
        select(Appointment, User.name)
        .join(User, User.id == Appointment.customer_id)
        .where(Appointment.clinic_id == clinic.id, Appointment.day == day,
               Appointment.status.in_(_ACTIVE))
        .order_by(Appointment.queue_number, Appointment.created_at)
    )).all()
    requests, waiting = [], []
    for a, name in rows:
        item = ClinicQueueItem(id=a.id, queue_number=a.queue_number, status=a.status,
                               patient_name=name, created_at=a.created_at)
        (requests if a.status == AppointmentStatus.REQUESTED.value else waiting).append(item)
    return ClinicQueueOut(day=day, current_number=int(clinic.current_number or 0),
                          requests=requests, waiting=waiting)


@router.get("/clinic/{clinic_id}/queue", response_model=ClinicQueueOut)
async def clinic_queue(
    clinic_id: uuid.UUID,
    day: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clinic = await _owned_clinic(clinic_id, user, db)
    return await _clinic_queue_out(clinic, day or date.today(), db)


@router.post("/clinic/{clinic_id}/accept/{appointment_id}", response_model=ClinicQueueOut)
async def accept_request(
    clinic_id: uuid.UUID,
    appointment_id: uuid.UUID,
    body: AcceptIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """قبول طلب وتعيين رقمه (افتراضياً التالي بعد أعلى رقم مُعيَّن)."""
    clinic = await _owned_clinic(clinic_id, user, db)
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.clinic_id != clinic_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")

    number = body.number
    if number is None:
        max_num = await db.scalar(
            select(func.max(Appointment.queue_number)).where(
                Appointment.clinic_id == clinic_id, Appointment.day == appt.day
            )
        )
        number = max(int(max_num or 0), int(clinic.current_number or 0)) + 1
    appt.queue_number = int(number)
    appt.status = AppointmentStatus.WAITING.value
    await db.commit()

    _push(appt, db, "✅ تم تأكيد موعدك", f"رقمك في {clinic.name}: {appt.queue_number}. تابع دورك في التطبيق")
    return await _clinic_queue_out(clinic, appt.day, db)


@router.post("/clinic/{clinic_id}/reject/{appointment_id}", response_model=ClinicQueueOut)
async def reject_request(
    clinic_id: uuid.UUID,
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clinic = await _owned_clinic(clinic_id, user, db)
    appt = await db.get(Appointment, appointment_id)
    if appt is None or appt.clinic_id != clinic_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    appt.status = AppointmentStatus.CANCELLED.value
    await db.commit()
    _push(appt, db, "موعدك", f"تعذّر قبول طلبك في {clinic.name} حالياً")
    return await _clinic_queue_out(clinic, appt.day, db)


@router.post("/clinic/{clinic_id}/current", response_model=ClinicQueueOut)
async def set_current(
    clinic_id: uuid.UUID,
    body: SetCurrentIn,
    day: date | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """ضبط «الرقم الحالي» (أو +1 إن غاب) — يشمل مرضى الحضور؛ يُشعر القريبين."""
    clinic = await _owned_clinic(clinic_id, user, db)
    d = day or date.today()
    new_current = int(body.number) if body.number is not None else int(clinic.current_number or 0) + 1
    new_current = max(0, new_current)
    clinic.current_number = new_current

    # إنهاء من تجاوزه الرقم الحالي
    passed = (await db.execute(
        select(Appointment).where(
            Appointment.clinic_id == clinic_id, Appointment.day == d,
            Appointment.status == AppointmentStatus.WAITING.value,
            Appointment.queue_number > 0, Appointment.queue_number < new_current,
        )
    )).scalars().all()
    for a in passed:
        a.status = AppointmentStatus.DONE.value
    await db.commit()

    # إشعارات: دورك الآن / اقترب دورك (1 أو 2 أمامه)
    near = (await db.execute(
        select(Appointment).where(
            Appointment.clinic_id == clinic_id, Appointment.day == d,
            Appointment.status == AppointmentStatus.WAITING.value,
            Appointment.queue_number >= new_current,
            Appointment.queue_number <= new_current + 2,
        )
    )).scalars().all()
    for a in near:
        ahead = a.queue_number - new_current
        if ahead == 0:
            _push(a, db, "🩺 حان دورك الآن", f"توجّه إلى {clinic.name} — أنت الآن على الطبيب")
        elif ahead == 1:
            _push(a, db, f"⏳ {clinic.name}", "أنت التالي! استعدّ للدخول")
        else:
            _push(a, db, f"⏳ {clinic.name}", f"اقترب دورك — بقي {ahead} أمامك")

    return await _clinic_queue_out(clinic, d, db)
