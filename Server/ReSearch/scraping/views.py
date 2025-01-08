from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from .models import ResearchPaper, BookmarkedPaper
from .serializers import ResearchPaperSerializer, BookmarkedPaperSerializer

class ResearchPaperViewSet(viewsets.ModelViewSet):
    queryset = ResearchPaper.objects.all()
    serializer_class = ResearchPaperSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'publication_date': ['gte', 'lte', 'exact'],
        'source': ['exact'],
        'categories': ['contains'],
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'bookmarked':
            return queryset.filter(
                paper_bookmarks__user=self.request.user,
                paper_bookmarks__is_active=True
            ).distinct()
        return queryset

    @action(detail=True, methods=['post'])
    def toggle_bookmark(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        
        if not user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        bookmark = BookmarkedPaper.objects.filter(
            user=user, 
            paper=paper,
            is_active=True
        ).first()
        
        if bookmark:
            bookmark.soft_delete()
            return Response({'status': 'unbookmarked'})
        else:
            bookmark = BookmarkedPaper.objects.create(
                user=user,
                paper=paper,
                notes=request.data.get('notes', ''),
                is_active=True
            )
            serializer = BookmarkedPaperSerializer(bookmark)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        # Prevent deletion if paper has active bookmarks
        if instance.paper_bookmarks.filter(is_active=True).exists():
            raise serializers.ValidationError(
                "Cannot delete paper with active bookmarks"
            )
        super().perform_destroy(instance)