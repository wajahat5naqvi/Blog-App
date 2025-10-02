from django.urls import path
from . import views

urlpatterns = [
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/count/', views.notification_count, name='notification-count'),
    path('notifications/read/all/', views.mark_all_notifications_read, name='mark-all-notifications-read'),
    path('notifications/read/<int:notification_id>/', views.mark_notification_read, name='mark-notification-read'),
]