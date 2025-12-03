"""
Views package for Edubooks API v2
Contains all view modules organized by domain
"""
from . import institution_views
from . import user_views
from . import book_views
from . import loan_views
from . import reservation_views
from . import invitation_views
from . import permission_views
from . import stats_views

__all__ = [
    'institution_views',
    'user_views',
    'book_views',
    'loan_views',
    'reservation_views',
    'invitation_views',
    'permission_views',
    'stats_views',
]
