from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('scraping/', include('scraping.urls')),
    path('chat/', include('chats.urls')),
    path('generic/', include('generic.urls'))
]
