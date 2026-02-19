from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.consent import UserConsent
from app.models.incident import Incident, IncidentComment, IncidentVote
from app.models.user import User
from app.schemas.consent import ConsentCreate, ConsentResponse
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    db.add(current_user)
    await db.flush()
    return UserResponse.model_validate(current_user)


@router.get("/me/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """LGPD: Export all personal data associated with the user."""
    profile = {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
        "role": current_user.role,
        "reputation": current_user.reputation,
        "created_at": str(current_user.created_at),
    }

    incidents_q = await db.execute(
        select(
            Incident.id,
            Incident.type,
            Incident.severity,
            Incident.status,
            Incident.description,
            Incident.created_at,
            func.ST_Y(Incident.public_geom).label("lat"),
            func.ST_X(Incident.public_geom).label("lon"),
        ).where(Incident.user_id == current_user.id)
        .order_by(Incident.created_at.desc())
    )
    incidents = [
        {
            "id": r.id,
            "type": r.type,
            "severity": r.severity,
            "status": r.status,
            "description": r.description,
            "lat": r.lat,
            "lon": r.lon,
            "created_at": str(r.created_at),
        }
        for r in incidents_q.all()
    ]

    votes_q = await db.execute(
        select(
            IncidentVote.incident_id,
            IncidentVote.vote,
            IncidentVote.created_at,
        ).where(IncidentVote.user_id == current_user.id)
    )
    votes = [
        {"incident_id": v.incident_id, "vote": v.vote, "created_at": str(v.created_at)}
        for v in votes_q.all()
    ]

    comments_q = await db.execute(
        select(
            IncidentComment.incident_id,
            IncidentComment.text,
            IncidentComment.created_at,
        ).where(IncidentComment.user_id == current_user.id)
    )
    comments = [
        {"incident_id": c.incident_id, "text": c.text, "created_at": str(c.created_at)}
        for c in comments_q.all()
    ]

    # Consents
    consents_q = await db.execute(
        select(UserConsent).where(UserConsent.user_id == current_user.id)
        .order_by(UserConsent.created_at.desc())
    )
    consents = [
        {
            "consent_type": c.consent_type,
            "version": c.version,
            "accepted": c.accepted,
            "created_at": str(c.created_at),
        }
        for c in consents_q.scalars().all()
    ]

    return {
        "profile": profile,
        "incidents": incidents,
        "votes": votes,
        "comments": comments,
        "consents": consents,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------- LGPD Consent ----------

@router.post("/me/consents", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def record_consent(
    body: ConsentCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record user consent for LGPD compliance."""
    client_ip = request.client.host if request.client else None
    consent = UserConsent(
        user_id=current_user.id,
        consent_type=body.consent_type.value,
        version=body.version,
        accepted=body.accepted,
        ip_address=client_ip,
    )
    db.add(consent)
    await db.flush()
    await db.refresh(consent)
    return ConsentResponse(
        id=consent.id,
        consent_type=consent.consent_type,
        version=consent.version,
        accepted=consent.accepted,
        created_at=consent.created_at,
    )


@router.get("/me/consents", response_model=list[ConsentResponse])
async def list_consents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all consent records for the current user."""
    result = await db.execute(
        select(UserConsent)
        .where(UserConsent.user_id == current_user.id)
        .order_by(UserConsent.created_at.desc())
    )
    return [
        ConsentResponse(
            id=c.id,
            consent_type=c.consent_type,
            version=c.version,
            accepted=c.accepted,
            created_at=c.created_at,
        )
        for c in result.scalars().all()
    ]


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.delete(current_user)
    await db.commit()
