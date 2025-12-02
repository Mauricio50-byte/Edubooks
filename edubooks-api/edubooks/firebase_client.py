import os
import firebase_admin
from firebase_admin import credentials, db, auth
from django.conf import settings


sa_path = settings.FIREBASE_SERVICE_ACCOUNT
if not firebase_admin._apps and sa_path and os.path.exists(sa_path):
    cred = credentials.Certificate(sa_path)
    firebase_admin.initialize_app(cred, {
        'databaseURL': settings.FIREBASE_DATABASE_URL
    })


def get_db():
    return db


def verify_token(id_token: str):
    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app()
        except Exception:
            pass
    return auth.verify_id_token(id_token)
