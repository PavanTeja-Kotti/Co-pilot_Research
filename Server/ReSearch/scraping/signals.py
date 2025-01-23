# signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import ResearchPaper

@receiver([post_save, post_delete], sender=ResearchPaper)
def clear_research_paper_cache(sender, instance, **kwargs):
   # Store cache keys when caching
    related_keys = cache.get("research_paper_cache_keys", set())
    for key in related_keys:
        cache.delete(key)