with open('c:/Users/user/Documents/ChatGPT/water-sight/water-sight/backend/models.py', 'a') as f:
    f.write('''
from flask_login import UserMixin
class User(Base, UserMixin):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=True)
    google_sub = Column(String, unique=True, index=True, nullable=True)
    profile_picture = Column(String, nullable=True)
    auth_provider = Column(String, default="local")
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
''')
