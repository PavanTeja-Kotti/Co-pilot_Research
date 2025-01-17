from django.db import models
from django.conf import settings
import uuid

class ResearchPaper(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL,
        null=True,
        related_name='user_bookmarks'
    )
    paper = models.ForeignKey(
        ResearchPaper, 
        on_delete=models.PROTECT,
        related_name='paper_bookmarks'
    )
    bookmarked_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

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
        self.is_active = False
        self.save()
    def hard_delete(self):
        super().delete()

class ResearchPaperCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    icon = models.TextField(null=True, blank=True)
    description = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_categories'
    )
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='CategoryLike',
        related_name='liked_categories'
    )
    like_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Research Paper Categories"
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['created_by']),
            models.Index(fields=['-like_count']),
        ]

    def __str__(self):
        return self.name

    def update_like_count(self):
        self.like_count = self.likes.count()
        self.save(update_fields=['like_count'])

    def toggle_like(self, user):
        try:
            like = CategoryLike.objects.get(user=user, category=self)
            like.delete()
            return False
        except CategoryLike.DoesNotExist:
            CategoryLike.objects.create(user=user, category=self)
            return True

    def is_liked_by(self, user):
        return self.likes.filter(id=user.id).exists()

class CategoryLike(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='user_category_likes'
    )
    category = models.ForeignKey(
        ResearchPaperCategory,
        on_delete=models.CASCADE,
        related_name='category_likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'category')
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['category', 'is_active']),
        ]

    def __str__(self):
        user_email = self.user.email if self.user else 'Deleted User'
        return f"{user_email} - {self.category.name}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and self.is_active:
            self.category.like_count = models.F('like_count') + 1
            self.category.save(update_fields=['like_count'])

    def delete(self, *args, **kwargs):
        if self.is_active:
            self.is_active = False
            self.save(update_fields=['is_active'])
            self.category.like_count = models.F('like_count') - 1
            self.category.save(update_fields=['like_count'])

    def hard_delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)