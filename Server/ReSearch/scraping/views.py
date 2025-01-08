from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from .models import ResearchPaper, BookmarkedPaper
from .serializers import ResearchPaperSerializer, BookmarkedPaperSerializer

def apply_filters(queryset, request):
    """Apply filters to queryset based on request parameters."""
    filters = {}
    
    # Publication date filters
    if date_gte := request.query_params.get('publication_date__gte'):
        filters['publication_date__gte'] = date_gte
    if date_lte := request.query_params.get('publication_date__lte'):
        filters['publication_date__lte'] = date_lte
    if date_exact := request.query_params.get('publication_date'):
        filters['publication_date'] = date_exact
        
    # Source and categories filters
    if source := request.query_params.get('source'):
        filters['source'] = source
    if categories := request.query_params.get('categories'):
        filters['categories__contains'] = categories
        
    return queryset.filter(**filters)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def research_paper_list(request):
    if request.method == 'GET':
        queryset = ResearchPaper.objects.all()
        filtered_queryset = apply_filters(queryset, request)
        serializer = ResearchPaperSerializer(filtered_queryset, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ResearchPaperSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticatedOrReadOnly])
def research_paper_detail(request, pk):
    paper = get_object_or_404(ResearchPaper, pk=pk)
    
    if request.method == 'GET':
        serializer = ResearchPaperSerializer(paper)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = ResearchPaperSerializer(
            paper,
            data=request.data,
            partial=(request.method == 'PATCH')
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Check for active bookmarks before deletion
        if paper.paper_bookmarks.filter(is_active=True).exists():
            return Response(
                {"error": "Cannot delete paper with active bookmarks"},
                status=status.HTTP_400_BAD_REQUEST
            )
        paper.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def bookmarked_papers(request):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    queryset = ResearchPaper.objects.filter(
        paper_bookmarks__user=request.user,
        paper_bookmarks__is_active=True
    ).distinct()
    
    filtered_queryset = apply_filters(queryset, request)
    serializer = ResearchPaperSerializer(filtered_queryset, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def toggle_bookmark(request, pk):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    paper = get_object_or_404(ResearchPaper, pk=pk)
    bookmark = BookmarkedPaper.objects.filter(
        user=request.user,
        paper=paper,
        is_active=True
    ).first()
    
    if bookmark:
        bookmark.soft_delete()
        return Response({'status': 'unbookmarked'})
    else:
        bookmark = BookmarkedPaper.objects.create(
            user=request.user,
            paper=paper,
            notes=request.data.get('notes', ''),
            is_active=True
        )
        serializer = BookmarkedPaperSerializer(bookmark)
        return Response(serializer.data, status=status.HTTP_201_CREATED)