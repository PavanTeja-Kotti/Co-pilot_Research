# scraping/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django import forms
from .models import ResearchPaper, BookmarkedPaper
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

admin.site.register(BookmarkedPaper, BookmarkedPaperAdmin)
admin.site.register(ResearchPaper, ResearchPaperAdmin)

# Update admin site info
admin.site.site_header = 'Research Paper Management'
admin.site.site_title = 'Research Paper Admin'
admin.site.index_title = 'Welcome to Research Paper Management Portal'