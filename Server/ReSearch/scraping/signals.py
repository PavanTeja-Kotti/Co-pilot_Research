from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import ResearchPaper, BookmarkedPaper, ReadPaper, CategoryLike

@receiver([post_save, post_delete], sender=ResearchPaper)
def clear_research_paper_cache(sender, instance, **kwargs):
    related_keys = cache.get("research_paper_cache_keys", set())
    for key in related_keys:
        cache.delete(key)

@receiver([post_save, post_delete], sender=BookmarkedPaper)
def clear_user_bookmark_cache(sender, instance, **kwargs):
    if instance.user:
        cache.delete(f'recommendations_{instance.user.id}')
        cache.delete(f'user_bookmarks_{instance.user.id}')

@receiver([post_save, post_delete], sender=ReadPaper)
def clear_user_read_cache(sender, instance, **kwargs):
    if instance.user:
        cache.delete(f'recommendations_{instance.user.id}')
        cache.delete(f'user_read_papers_{instance.user.id}')

@receiver([post_save, post_delete], sender=CategoryLike)
def clear_user_interests_cache(sender, instance, **kwargs):
    if instance.user:
        cache.delete(f'recommendations_{instance.user.id}')
        cache.delete(f'user_interests_{instance.user.id}')
        
def get_user_cache_keys(user_id):
    """Helper function to get all cache keys for a user"""
    return [
        f'recommendations_{user_id}',
        f'user_bookmarks_{user_id}',
        f'user_read_papers_{user_id}',
        f'user_interests_{user_id}'
    ]

def clear_all_user_cache(user_id):
    """Clear all cache entries for a user"""
    for key in get_user_cache_keys(user_id):
        cache.delete(key)