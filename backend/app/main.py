from datetime import date, time
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query, Response
from pydantic import BaseModel

from app.analysis import FIRST_DELIVERY, LAST_DELIVERY, forecast_view, month_view

app = FastAPI(
    title="API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


@app.get("/api/health", response_model=HealthResponse)
async def health(response: Response) -> HealthResponse:
    response.headers["Cache-Control"] = "no-store"
    return HealthResponse()


@app.get("/api/forecast")
def get_forecast(
    delivery_date: date = date(2026, 1, 16),
    cutoff: Annotated[str, Query(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")] = "10:00",
):
    if not FIRST_DELIVERY <= delivery_date <= LAST_DELIVERY:
        raise HTTPException(
            422, "Delivery date must be between 1 January and 1 February 2026"
        )
    return forecast_view(delivery_date, time.fromisoformat(cutoff))


@app.get("/api/monthly")
def get_monthly(
    cutoff: Annotated[str, Query(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")] = "10:00",
):
    return month_view(time.fromisoformat(cutoff))
