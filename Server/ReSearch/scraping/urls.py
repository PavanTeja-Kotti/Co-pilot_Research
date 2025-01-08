from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResearchPaperViewSet



urlpatterns = [
    path('research-papers/', ResearchPaperViewSet.as_view({'get': 'list'})),
    path('research-papers/<int:pk>/', ResearchPaperViewSet.as_view({'get': 'retrieve'})),
    path('research-papers/<int:pk>/toggle-bookmark/', ResearchPaperViewSet.as_view({'post': 'toggle_bookmark'})),
   
]