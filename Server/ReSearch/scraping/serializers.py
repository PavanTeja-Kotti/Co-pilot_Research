from rest_framework import serializers
from .models import ResearchPaper, BookmarkedPaper, ResearchPaperCategory, CategoryLike,ReadPaper

class CategoryBriefSerializer(serializers.ModelSerializer):
    """Simplified version of Category serializer"""
    class Meta:
        model = ResearchPaperCategory
        fields = [
            'id',
            'name',
            'icon',
            'description',
            'like_count'
        ]

class CategoryLikeSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    
    class Meta:
        model = CategoryLike
        fields = [
            'id',
            'category',
            'user_email',
            'created_at',
            'is_active'
        ]
        read_only_fields = ['created_at', 'user_email']

    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Deleted User'

class CategorySerializer(serializers.ModelSerializer):
    is_liked = serializers.SerializerMethodField()
    created_by_email = serializers.SerializerMethodField()
    active_likes_count = serializers.SerializerMethodField()
    likes = CategoryLikeSerializer(source='category_likes', many=True, read_only=True)

    class Meta:
        model = ResearchPaperCategory
        fields = [
            'id',
            'name',
            'icon',
            'description',
            'created_by',
            'created_by_email',
            'created_at',
            'updated_at',
            'like_count',
            'is_liked',
            'active_likes_count',
            'likes'
        ]
        read_only_fields = ['created_at', 'updated_at', 'like_count', 'is_liked', 'active_likes_count']

    def get_created_by_email(self, obj):
        return obj.created_by.email if obj.created_by else 'Deleted User'

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.category_likes.filter(
                user=request.user,
                is_active=True
            ).exists()
        return False

    def get_active_likes_count(self, obj):
        return obj.category_likes.filter(is_active=True).count()

# Your existing serializers with minor updates
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
            'publication_date',
            'citation_count',
            'categories',
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
    
class ReadPaperSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    paper_details = ResearchPaperBriefSerializer(source='paper', read_only=True)
    class Meta:
        model = ReadPaper
        fields = [
            'id',
            'paper',
            'paper_details',
            'user_email',
            'read_at',
            'notes',
            'is_active'
        ]
        read_only_fields = ['read_at', 'user_email']

    def get_user_email(self, obj):
        return obj.user.email if obj.user else 'Deleted User'

class ResearchPaperSerializer(serializers.ModelSerializer):
    is_bookmarked = serializers.SerializerMethodField()
    is_paper_read=serializers.SerializerMethodField()
    bookmark_id = serializers.SerializerMethodField()
    active_bookmarks_count = serializers.SerializerMethodField()
    # bookmarks = BookmarkedPaperSerializer(source='paper_bookmarks', many=True, read_only=True)

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
            # 'bookmarks',
            'is_paper_read'
            
        ]
        read_only_fields = ['created_at', 'is_bookmarked', 'bookmark_id', 'active_bookmarks_count','is_paper_read']

    def get_is_paper_read(self,obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.paper_readers.filter(
                user=request.user,
                is_active=True
            ).exists()
        return False

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