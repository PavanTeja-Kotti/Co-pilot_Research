from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_file, name='upload_file'),
    path('files/<path:file_path>', views.get_file, name='get_file'),
]