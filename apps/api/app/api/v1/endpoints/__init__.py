from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.incidents import router as incidents_router
from app.api.v1.endpoints.locations import router as locations_router
from app.api.v1.endpoints.services import router as services_router
from app.api.v1.endpoints.alerts import router as alerts_router
from app.api.v1.endpoints.routes import router as routes_router
from app.api.v1.endpoints.billing import router as billing_router
from app.api.v1.endpoints.uploads import router as uploads_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(incidents_router)
api_router.include_router(locations_router)
api_router.include_router(services_router)
api_router.include_router(alerts_router)
api_router.include_router(routes_router)
api_router.include_router(billing_router)
api_router.include_router(uploads_router)
