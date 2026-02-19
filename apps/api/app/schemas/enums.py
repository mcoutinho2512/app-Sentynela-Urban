"""Shared enums for type-safe validation across the entire API."""

from enum import Enum


class IncidentType(str, Enum):
    alagamento = "alagamento"
    tiroteio = "tiroteio"
    assalto = "assalto"
    acidente = "acidente"
    incendio = "incendio"
    policia = "policia"
    perigo = "perigo"
    lixo = "lixo"
    obras = "obras"
    queda_arvore = "queda_arvore"
    buraco = "buraco"
    deslizamento = "deslizamento"
    falta_luz = "falta_luz"
    falta_agua = "falta_agua"
    animal = "animal"
    manifestacao = "manifestacao"
    outros = "outros"


class Severity(str, Enum):
    baixa = "baixa"
    media = "media"
    alta = "alta"


class IncidentStatus(str, Enum):
    open = "open"
    resolved = "resolved"
    disputed = "disputed"


class VoteType(str, Enum):
    confirm = "confirm"
    refute = "refute"
    resolved = "resolved"


class LocationType(str, Enum):
    home = "home"
    work = "work"
    favorite = "favorite"


class RouteProfile(str, Enum):
    driving_car = "driving-car"
    cycling_regular = "cycling-regular"
    foot_walking = "foot-walking"


# Incident types that require extra privacy (geo fuzzing)
SENSITIVE_INCIDENT_TYPES = {
    IncidentType.tiroteio,
    IncidentType.assalto,
    IncidentType.policia,
}

# Incident types that require minimum reputation to report
RESTRICTED_INCIDENT_TYPES = {
    IncidentType.tiroteio,
    IncidentType.assalto,
}

MINIMUM_REPUTATION_FOR_RESTRICTED = 10
