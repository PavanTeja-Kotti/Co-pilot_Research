from django.db import models
from django.conf import settings

class ResearchPaper(models.Model):
    title = models.CharField(max_length=500)
    abstract = models.TextField()
    authors = models.JSONField()
    source = models.CharField(max_length=50)
    url = models.URLField()
    pdf_url = models.URLField(null=True, blank=True)
    categories = models.JSONField(default=list)
    publication_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    bookmarked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        through='BookmarkedPaper', 
        related_name='bookmarked_papers'
    )

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-publication_date']
        indexes = [
            models.Index(fields=['-publication_date']),
            models.Index(fields=['source']),
        ]

class BookmarkedPaper(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,  # Changed from CASCADE to SET_NULL
        null=True,
        related_name='user_bookmarks'
    )
    paper = models.ForeignKey(
        ResearchPaper, 
        on_delete=models.PROTECT,  # Changed from CASCADE to PROTECT
        related_name='paper_bookmarks'
    )
    bookmarked_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)  # Added to track active bookmarks

    class Meta:
        unique_together = ('user', 'paper')
        ordering = ['-bookmarked_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['paper', 'is_active']),
        ]

    def __str__(self):
        user_email = self.user.email if self.user else 'Deleted User'
        return f"{user_email} - {self.paper.title}"

    def soft_delete(self):
        """Soft delete the bookmark instead of actually deleting it"""
        self.is_active = False
        self.save()