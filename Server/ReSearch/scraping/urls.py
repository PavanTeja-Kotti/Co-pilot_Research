from django.urls import path,register_converter
from . import views
from uuid import UUID
app_name = 'research_papers'

urlpatterns = [
    path('papers/', views.research_paper_list),
    path('papers/<int:pk>/', views.research_paper_detail),
    path('papers/bookmarked/', views.bookmarked_papers),
    path('papers/<str:pk>/bookmark/', views.toggle_bookmark),
    path('papers/summarization/<str:url>/', views.summarization_paper),
    
    path('categoriesonly/', views.category_listonly, name='category-list'),
    path('categoriesonly/<int:pk>/', views.category_detailonly, name='category-detail'),
    path('categories/', views.category_list),
    path('categories/<int:pk>/', views.category_detail),
    path('categories/<int:pk>/like/', views.toggle_category_like),
    path('categories_like_list/', views.category_like_list),
]