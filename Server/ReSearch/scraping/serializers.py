# scraping/serializers.py
from rest_framework import serializers
from .models import ResearchPaper, BookmarkedPaper

class ResearchPaperBriefSerializer(serializers.ModelSerializer):
    """A simplified version of ResearchPaper serializer to avoid circular imports"""
    class Meta:
        model = ResearchPaper
        fields = [
            'id',
            'title',
            'abstract',
            'authors',
            'source',
            'url',
            'publication_date'
        ]

class BookmarkedPaperSerializer(serializers.ModelSerializer):
    paper_details = ResearchPaperBriefSerializer(source='paper', read_only=True)
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = BookmarkedPaper
        fields = [
            'id',
            'paper',
            'paper_details',
            'user_email',
            'bookmarked_at',
            'notes',
            'is_active'
        ]
        read_only_fields = ['bookmarked_at', 'user_email']

    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Deleted User'

class ResearchPaperSerializer(serializers.ModelSerializer):
    is_bookmarked = serializers.SerializerMethodField()
    bookmark_id = serializers.SerializerMethodField()
    active_bookmarks_count = serializers.SerializerMethodField()
    bookmarks = BookmarkedPaperSerializer(source='paper_bookmarks', many=True, read_only=True)

    class Meta:
        model = ResearchPaper
        fields = [
            'id',
            'title',
            'abstract',
            'authors',
            'source',
            'url',
            'pdf_url',
            'categories',
            'publication_date',
            'created_at',
            'is_bookmarked',
            'bookmark_id',
            'active_bookmarks_count',
            'bookmarks'
        ]
        read_only_fields = ['created_at', 'is_bookmarked', 'bookmark_id', 'active_bookmarks_count']

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.paper_bookmarks.filter(
                user=request.user,
                is_active=True
            ).exists()
        return False

    def get_bookmark_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            bookmark = obj.paper_bookmarks.filter(
                user=request.user,
                is_active=True
            ).first()
            return bookmark.id if bookmark else None
        return None

    def get_active_bookmarks_count(self, obj):
        return obj.paper_bookmarks.filter(is_active=True).count()