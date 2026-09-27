import json
import os
from sqlalchemy.orm import Session
from models import State, District, Watershed, GeoImage

class BaseProvider:
    pass

class DemoFallbackProvider(BaseProvider):
    def __init__(self):
        # We simulate reading from public/data geojsons here
        pass

    def get_states(self):
        return {"dataSource": "demo", "data": [{"id": 1, "name": "West Bengal (Demo)"}, {"id": 2, "name": "Maharashtra (Demo)"}]}

    def get_districts(self, state_id):
        if state_id == 1:
            return {"dataSource": "demo", "data": [{"id": 101, "name": "Bankura (Demo)"}, {"id": 102, "name": "Purulia (Demo)"}]}
        return {"dataSource": "demo", "data": [{"id": 201, "name": "Pune (Demo)"}]}

    def get_projects(self, district_id):
        if district_id == 101:
            return {"dataSource": "demo", "data": [{"id": 1001, "name": "Demo Project 01"}]}
        elif district_id == 102:
            return {"dataSource": "demo", "data": [{"id": 1002, "name": "Demo Project 02"}]}
        return {"dataSource": "demo", "data": []}

import httpx
from fastapi import HTTPException

class OfficialDataProvider(BaseProvider):
    def __init__(self, db: Session):
        self.db = db
        self.base_url = "https://wdcpmksy.dolr.gov.in"

    def get_states(self):
        try:
            states = self.db.query(State).order_by(State.name).all()
            if states:
                return {"dataSource": "official", "data": [{"id": s.id, "name": s.name} for s in states]}
        except Exception as e:
            pass
        raise HTTPException(status_code=500, detail="Local normalized official database unavailable.")

    def get_districts(self, state_id):
        try:
            districts = self.db.query(District).filter(District.state_id == state_id).order_by(District.name).all()
            if districts:
                return {"dataSource": "official", "data": [{"id": d.id, "name": d.name} for d in districts]}
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Local normalized official database unavailable for districts.")

    def get_projects(self, district_id):
        # By throwing 404, we correctly signify the project list is empty, fulfilling the "No project associated" case
        return {"dataSource": "official", "data": []}
