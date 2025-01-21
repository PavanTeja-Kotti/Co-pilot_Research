from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django import forms
from .models import ResearchPaper, BookmarkedPaper, ResearchPaperCategory, CategoryLike,ReadPaper
import json

class ResearchPaperForm(forms.ModelForm):
    authors_text = forms.CharField(widget=forms.Textarea, help_text="Enter authors as JSON array", required=True)
    categories_text = forms.CharField(widget=forms.Textarea, help_text="Enter categories as JSON array", required=True)

    class Meta:
        model = ResearchPaper
        fields = [
            'title',
            'abstract',
            'authors_text',
            'source',
            'url',
            'pdf_url',
            'categories_text',
            'publication_date',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            # If editing existing instance, populate JSON fields
            self.fields['authors_text'].initial = json.dumps(self.instance.authors, indent=2)
            self.fields['categories_text'].initial = json.dumps(self.instance.categories, indent=2)

    def clean_authors_text(self):
        try:
            authors = json.loads(self.cleaned_data['authors_text'])
            if not isinstance(authors, list):
                raise forms.ValidationError("Authors must be a JSON array")
            return authors
        except json.JSONDecodeError:
            raise forms.ValidationError("Please enter valid JSON")

    def clean_categories_text(self):
        try:
            categories = json.loads(self.cleaned_data['categories_text'])
            if not isinstance(categories, list):
                raise forms.ValidationError("Categories must be a JSON array")
            return categories
        except json.JSONDecodeError:
            raise forms.ValidationError("Please enter valid JSON")

    def save(self, commit=True):
        instance = super().save(commit=False)
        instance.authors = self.cleaned_data['authors_text']
        instance.categories = self.cleaned_data['categories_text']
        if commit:
            instance.save()
        return instance

class ResearchPaperAdmin(admin.ModelAdmin):
    form = ResearchPaperForm
    list_display = ['title', 'source', 'formatted_authors', 'publication_date', 'active_bookmarks_count', 'created_at']
    list_filter = ['source', 'publication_date', 'created_at']
    search_fields = ['title', 'abstract']
    date_hierarchy = 'publication_date'
    readonly_fields = ['created_at', 'bookmarks_preview']

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'abstract', 'authors_text', 'source')
        }),
        ('URLs', {
            'fields': ('url', 'pdf_url')
        }),
        ('Dates', {
            'fields': ('publication_date', 'created_at')
        }),
        ('Categories', {
            'fields': ('categories_text',)
        }),
        ('Statistics', {
            'fields': ('citation_count', 'average_reading_time')
        }),
        ('Bookmarks', {
            'fields': ('bookmarks_preview',)
        })
    )
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            active_bookmarks_count=Count(
                'paper_bookmarks',
                filter=Q(paper_bookmarks__is_active=True)
            )
        )

    def formatted_authors(self, obj):
        if isinstance(obj.authors, str):
            try:
                authors = json.loads(obj.authors)
            except json.JSONDecodeError:
                return obj.authors
        else:
            authors = obj.authors
        
        if isinstance(authors, list):
            return ', '.join(str(author) for author in authors)
        return str(authors)
    formatted_authors.short_description = 'Authors'

    def active_bookmarks_count(self, obj):
        url = reverse('admin:scraping_bookmarkedpaper_changelist')
        return format_html('<a href="{}?paper__id={}&is_active=1">{}</a>', 
                         url, obj.id, obj.active_bookmarks_count)
    active_bookmarks_count.short_description = 'Active Bookmarks'
    active_bookmarks_count.admin_order_field = 'active_bookmarks_count'

    def bookmarks_preview(self, obj):
        if not obj.pk:  # If this is a new object
            return "Save the paper first to see bookmarks"
            
        bookmarks = obj.paper_bookmarks.filter(is_active=True)[:5]
        if not bookmarks:
            return "No active bookmarks"
        
        html = ['<div style="margin-bottom: 10px;">Recent bookmarks:</div><ul>']
        for bookmark in bookmarks:
            user_email = bookmark.user.email if bookmark.user else 'Deleted User'
            html.append(f'<li>{user_email} - {bookmark.bookmarked_at.strftime("%Y-%m-%d %H:%M")}</li>')
        html.append('</ul>')
        
        total = obj.paper_bookmarks.filter(is_active=True).count()
        if total > 5:
            url = reverse('admin:scraping_bookmarkedpaper_changelist')
            html.append(format_html('<a href="{}?paper__id={}&is_active=1">View all {} bookmarks</a>', 
                                  url, obj.id, total))
        
        return format_html(''.join(html))
    bookmarks_preview.short_description = 'Active Bookmarks Preview'

class BookmarkedPaperAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'paper_title', 'bookmarked_at', 'is_active', 'notes_preview']
    list_filter = ['is_active', 'bookmarked_at']
    search_fields = ['user__email', 'paper__title', 'notes']
    raw_id_fields = ['user', 'paper']
    date_hierarchy = 'bookmarked_at'
    readonly_fields = ['bookmarked_at']
    list_per_page = 25

    def user_email(self, obj):
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Deleted User'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'

    def paper_title(self, obj):
        url = reverse('admin:scraping_researchpaper_change', args=[obj.paper.id])
        return format_html('<a href="{}">{}</a>', url, obj.paper.title)
    paper_title.short_description = 'Paper'
    paper_title.admin_order_field = 'paper__title'

    def notes_preview(self, obj):
        if obj.notes:
            return obj.notes[:50] + '...' if len(obj.notes) > 50 else obj.notes
        return '-'
    notes_preview.short_description = 'Notes Preview'

class ResearchPaperCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'created_by_email', 'active_likes_count', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'like_count', 'likes_preview']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'icon', 'description')
        }),
        ('Creator Information', {
            'fields': ('created_by',)
        }),
        ('Statistics', {
            'fields': ('like_count', 'likes_preview')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        })
    )

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        return queryset.annotate(
            active_likes_count=Count(
                'category_likes',
                filter=Q(category_likes__is_active=True)
            )
        )

    def created_by_email(self, obj):
        if obj.created_by:
            url = reverse('admin:accounts_user_change', args=[obj.created_by.id])
            return format_html('<a href="{}">{}</a>', url, obj.created_by.email)
        return 'Deleted User'
    created_by_email.short_description = 'Created By'
    created_by_email.admin_order_field = 'created_by__email'

    def active_likes_count(self, obj):
        url = reverse('admin:scraping_categorylike_changelist')
        return format_html('<a href="{}?category__id={}&is_active=1">{}</a>', 
                         url, obj.id, obj.active_likes_count)
    active_likes_count.short_description = 'Active Likes'
    active_likes_count.admin_order_field = 'active_likes_count'

    def likes_preview(self, obj):
        if not obj.pk:
            return "Save the category first to see likes"
            
        likes = obj.category_likes.filter(is_active=True)[:5]
        if not likes:
            return "No active likes"
        
        html = ['<div style="margin-bottom: 10px;">Recent likes:</div><ul>']
        for like in likes:
            user_email = like.user.email if like.user else 'Deleted User'
            html.append(f'<li>{user_email} - {like.created_at.strftime("%Y-%m-%d %H:%M")}</li>')
        html.append('</ul>')
        
        total = obj.category_likes.filter(is_active=True).count()
        if total > 5:
            url = reverse('admin:scraping_categorylike_changelist')
            html.append(format_html('<a href="{}?category__id={}&is_active=1">View all {} likes</a>', 
                                  url, obj.id, total))
        
        return format_html(''.join(html))
    likes_preview.short_description = 'Active Likes Preview'

class CategoryLikeAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'category_name', 'created_at', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__email', 'category__name']
    raw_id_fields = ['user', 'category']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at']
    list_per_page = 25

    def user_email(self, obj):
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Deleted User'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'

    def category_name(self, obj):
        url = reverse('admin:scraping_researchpapercategory_change', args=[obj.category.id])
        return format_html('<a href="{}">{}</a>', url, obj.category.name)
    category_name.short_description = 'Category'
    category_name.admin_order_field = 'category__name'


@admin.register(ReadPaper)
class ReadPaperAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'paper_title', 'read_at', 'is_active', 'notes_preview']
    list_filter = ['is_active', 'read_at']
    search_fields = ['user__email', 'paper__title', 'notes']
    raw_id_fields = ['user', 'paper']
    date_hierarchy = 'read_at'
    readonly_fields = ['read_at']
    list_per_page = 25

    def user_email(self, obj):
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return 'Deleted User'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'

    def paper_title(self, obj):
        url = reverse('admin:scraping_researchpaper_change', args=[obj.paper.id])
        return format_html('<a href="{}">{}</a>', url, obj.paper.title)
    paper_title.short_description = 'Paper'
    paper_title.admin_order_field = 'paper__title'

    def notes_preview(self, obj):
        if obj.notes:
            return obj.notes[:50] + '...' if len(obj.notes) > 50 else obj.notes
        return '-'
    notes_preview.short_description = 'Notes Preview'

    actions = ['mark_active', 'mark_inactive']

    def mark_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} read papers marked as active.')
    mark_active.short_description = "Mark selected papers as active"

    def mark_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} read papers marked as inactive.')
    mark_inactive.short_description = "Mark selected papers as inactive"
# Register all models
# admin.site.register(ReadPaper, ReadPaperAdmin)
admin.site.register(ResearchPaper, ResearchPaperAdmin)
admin.site.register(BookmarkedPaper, BookmarkedPaperAdmin)
admin.site.register(ResearchPaperCategory, ResearchPaperCategoryAdmin)
admin.site.register(CategoryLike, CategoryLikeAdmin)

# Update admin site info
admin.site.site_header = 'Research Paper Management'
admin.site.site_title = 'Research Paper Admin'
admin.site.index_title = 'Welcome to Research Paper Management Portal'