from django.urls import path
from . import views

app_name = 'research_papers'

urlpatterns = [
    path('papers/', views.research_paper_list, name='paper-list'),
    path('papers/<int:pk>/', views.research_paper_detail, name='paper-detail'),
    path('papers/bookmarked/', views.bookmarked_papers, name='bookmarked-papers'),
    path('papers/<int:pk>/toggle-bookmark/', views.toggle_bookmark, name='toggle-bookmark'),
]