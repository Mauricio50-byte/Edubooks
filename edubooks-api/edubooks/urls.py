from django.urls import path
from django.http import JsonResponse
from edubooks.views import (
    institution_views, user_views, book_views, loan_views, 
    reservation_views, invitation_views, permission_views, stats_views
)

urlpatterns = [
    path('', lambda request: JsonResponse({
        'service': 'edubooks-api',
        'status': 'ok'
    })),
    
    # Institutions
    path('api/institutions/', institution_views.list_institutions),
    path('api/institutions/create/', institution_views.create_institution),
    path('api/institutions/<str:institution_id>/', institution_views.get_institution),
    
    # Users
    path('api/users/', user_views.list_users),
    path('api/users/create/', user_views.create_user),
    path('api/users/<str:user_uid>/', user_views.get_user),
    path('api/users/<str:user_uid>/update/', user_views.update_user),
    path('api/users/<str:user_uid>/delete/', user_views.delete_user),
    path('api/users/<str:user_uid>/apply-sanction/', user_views.apply_sanction),
    path('api/users/<str:user_uid>/add-fine/', user_views.add_fine),
    
    # Books
    path('api/books/external/search/', book_views.search_external_books),
    path('api/books/', book_views.list_books),
    path('api/books/create/', book_views.create_book),
    path('api/books/<str:book_id>/', book_views.get_book),
    path('api/books/<str:book_id>/update/', book_views.update_book),
    path('api/books/<str:book_id>/delete/', book_views.delete_book),
    
    # Loans
    path('api/loans/', loan_views.list_loans),
    path('api/loans/request/', loan_views.create_loan_request),
    path('api/loans/overdue/', loan_views.list_overdue_loans),
    path('api/loans/<str:loan_id>/approve/', loan_views.approve_loan),
    path('api/loans/<str:loan_id>/reject/', loan_views.reject_loan),
    path('api/loans/<str:loan_id>/return/', loan_views.return_loan),
    path('api/loans/<str:loan_id>/renew/', loan_views.renew_loan),
    
    # Reservations
    path('api/reservations/', reservation_views.list_reservations),
    path('api/reservations/create/', reservation_views.create_reservation),
    path('api/reservations/<str:reservation_id>/cancel/', reservation_views.cancel_reservation),
    
    # Invitations
    path('api/invitations/', invitation_views.list_invitations),
    path('api/invitations/create/', invitation_views.create_invitation),
    path('api/invitations/validate/', invitation_views.validate_invitation_token),
    path('api/invitations/accept/', invitation_views.accept_invitation),
    path('api/invitations/<str:invitation_id>/cancel/', invitation_views.cancel_invitation),
    
    # Permissions
    path('api/permissions/me/', permission_views.get_my_permissions),
    path('api/permissions/check/', permission_views.check_permission),
    path('api/permissions/role-info/', permission_views.get_role_info),
    
    # Statistics
    path('api/stats/dashboard/', stats_views.get_dashboard),
    path('api/stats/popular-books/', stats_views.get_popular_books),
    path('api/stats/user-activity/', stats_views.get_user_activity),
]
