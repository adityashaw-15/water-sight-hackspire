import json
import os
from sqlalchemy.orm import Session
from main import engine, SessionLocal
from models import Base, State, District

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if db.query(State).count() == 0:
        if os.path.exists("states-and-districts.json"):
            with open("states-and-districts.json", "r", encoding="utf-8") as f:
                data = json.load(f)
                for s_data in data["states"]:
                    state_name = s_data["state"]
                    state = State(name=state_name)
                    db.add(state)
                    db.flush()
                    for d_name in s_data["districts"]:
                        district = District(name=d_name, state_id=state.id)
                        db.add(district)
            db.commit()
            print("Successfully populated states and districts!")
        else:
            print("Warning: states-and-districts.json not found.")
    db.close()

if __name__ == "__main__":
    init_db()

