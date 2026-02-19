from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID, ST_X, ST_Y
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.incident import Incident, IncidentComment, IncidentVote
from app.models.user import User
from app.schemas.incident import (
    IncidentCommentCreate,
    IncidentCommentResponse,
    IncidentCreate,
    IncidentListResponse,
    IncidentResponse,
    IncidentVoteCreate,
)

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    body: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    point = func.ST_SetSRID(func.ST_MakePoint(body.lon, body.lat), 4326)

    incident = Incident(
        user_id=current_user.id,
        type=body.type,
        severity=body.severity,
        description=body.description,
        photo_url=body.photo_url,
        geom=point,
        public_geom=point,
    )
    db.add(incident)
    await db.flush()
    await db.refresh(incident)

    return await _incident_to_response(db, incident, current_user.id)


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_m: int = Query(1000, ge=100, le=50000),
    status_filter: str | None = Query(None, alias="status"),
    type_filter: str | None = Query(None, alias="type"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    center = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
    base = select(Incident).where(
        func.ST_DWithin(
            cast(Incident.public_geom, Geography),
            cast(center, Geography),
            radius_m,
        )
    )

    if status_filter:
        base = base.where(Incident.status == status_filter)
    if type_filter:
        base = base.where(Incident.type == type_filter)

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    rows = await db.execute(
        base.order_by(Incident.created_at.desc()).offset(offset).limit(limit)
    )
    incidents = rows.scalars().all()

    items = [await _incident_to_response(db, inc, current_user.id) for inc in incidents]
    return IncidentListResponse(incidents=items, total=total)


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    incident = await db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return await _incident_to_response(db, incident, current_user.id)


@router.post("/{incident_id}/vote", status_code=status.HTTP_201_CREATED)
async def vote_incident(
    incident_id: int,
    body: IncidentVoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    incident = await db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    existing = await db.execute(
        select(IncidentVote).where(
            IncidentVote.incident_id == incident_id,
            IncidentVote.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already voted")

    vote = IncidentVote(
        incident_id=incident_id,
        user_id=current_user.id,
        vote=body.vote,
    )
    db.add(vote)

    # Adjust reputation on the incident author
    author = await db.get(User, incident.user_id)
    if author:
        if body.vote == "confirm":
            author.reputation = (author.reputation or 0) + settings.REPUTATION_CONFIRM_BONUS
        elif body.vote == "refute":
            author.reputation = (author.reputation or 0) - settings.REPUTATION_REFUTE_PENALTY
        elif body.vote == "resolved":
            author.reputation = (author.reputation or 0) + settings.REPUTATION_RESOLVE_BONUS
            incident.status = "resolved"
        db.add(author)

    # Auto-resolve or auto-dispute based on thresholds
    confirm_count = (
        await db.execute(
            select(func.count()).where(
                IncidentVote.incident_id == incident_id,
                IncidentVote.vote == "confirm",
            )
        )
    ).scalar() or 0
    refute_count = (
        await db.execute(
            select(func.count()).where(
                IncidentVote.incident_id == incident_id,
                IncidentVote.vote == "refute",
            )
        )
    ).scalar() or 0

    if refute_count >= settings.REPUTATION_THRESHOLD_REFUTATIONS:
        incident.status = "disputed"
    elif confirm_count >= settings.REPUTATION_THRESHOLD_CONFIRMATIONS and incident.status == "open":
        # Confirmed incidents stay open but could trigger alerts
        pass

    db.add(incident)
    await db.flush()
    return {"detail": "Vote recorded"}


@router.post("/{incident_id}/comments", response_model=IncidentCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    incident_id: int,
    body: IncidentCommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    incident = await db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    comment = IncidentComment(
        incident_id=incident_id,
        user_id=current_user.id,
        text=body.text,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    return IncidentCommentResponse(
        id=comment.id,
        incident_id=comment.incident_id,
        user_id=comment.user_id,
        user_name=current_user.name,
        text=comment.text,
        created_at=comment.created_at,
    )


@router.get("/{incident_id}/comments", response_model=list[IncidentCommentResponse])
async def list_comments(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(IncidentComment, User.name)
        .join(User, IncidentComment.user_id == User.id)
        .where(IncidentComment.incident_id == incident_id)
        .order_by(IncidentComment.created_at.asc())
    )
    rows = result.all()
    return [
        IncidentCommentResponse(
            id=comment.id,
            incident_id=comment.incident_id,
            user_id=comment.user_id,
            user_name=user_name,
            text=comment.text,
            created_at=comment.created_at,
        )
        for comment, user_name in rows
    ]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _incident_to_response(
    db: AsyncSession, incident: Incident, viewer_user_id: int
) -> IncidentResponse:
    """Build an IncidentResponse with vote counts and viewer's vote."""
    confirm_count = (
        await db.execute(
            select(func.count()).where(
                IncidentVote.incident_id == incident.id,
                IncidentVote.vote == "confirm",
            )
        )
    ).scalar() or 0

    refute_count = (
        await db.execute(
            select(func.count()).where(
                IncidentVote.incident_id == incident.id,
                IncidentVote.vote == "refute",
            )
        )
    ).scalar() or 0

    viewer_vote_row = await db.execute(
        select(IncidentVote.vote).where(
            IncidentVote.incident_id == incident.id,
            IncidentVote.user_id == viewer_user_id,
        )
    )
    viewer_vote = viewer_vote_row.scalar_one_or_none()

    # Extract lat/lon from public_geom via ST_X / ST_Y
    coords = await db.execute(
        select(
            func.ST_Y(incident.public_geom).label("lat"),
            func.ST_X(incident.public_geom).label("lon"),
        )
    )
    row = coords.one()

    return IncidentResponse(
        id=incident.id,
        user_id=incident.user_id,
        type=incident.type,
        severity=incident.severity,
        status=incident.status,
        description=incident.description,
        photo_url=incident.photo_url,
        lat=row.lat,
        lon=row.lon,
        created_at=incident.created_at,
        expires_at=incident.expires_at,
        confirmations=confirm_count,
        refutations=refute_count,
        user_vote=viewer_vote,
    )
