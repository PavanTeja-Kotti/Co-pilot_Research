from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.pagination import LimitOffsetPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import ResearchPaper, BookmarkedPaper, ResearchPaperCategory, CategoryLike
from .serializers import (
    ResearchPaperSerializer, 
    BookmarkedPaperSerializer,
    CategorySerializer,
    CategoryLikeSerializer
)
def apply_filters(queryset, request):
    """Apply filters to queryset based on request parameters."""
    filters = {}
    
    # Text search across multiple fields
    if search_text := request.query_params.get('search'):
        # Handle JSON field search for authors
        queryset = queryset.filter(
            Q(title__icontains=search_text) |
            Q(abstract__icontains=search_text) |
            # Search within the JSON array of authors
            Q(authors__icontains=search_text)
        )
    
    # Publication date filters
    if date_gte := request.query_params.get('publication_date__gte'):
        filters['publication_date__gte'] = date_gte
    if date_lte := request.query_params.get('publication_date__lte'):
        filters['publication_date__lte'] = date_lte
    if date_exact := request.query_params.get('publication_date'):
        filters['publication_date'] = date_exact
        
    # Source filter
    if source := request.query_params.get('source'):
        filters['source__iexact'] = source
    
    # Categories filter (JSON field)
    if category := request.query_params.get('category'):
        # Search for the category name in the JSON array
        queryset = queryset.filter(categories__contains=[category])
    
    # Bookmark filter (if user is authenticated)
    if request.user.is_authenticated:
        if bookmarked := request.query_params.get('bookmarked'):
            if bookmarked.lower() == 'true':
                queryset = queryset.filter(bookmarked_by=request.user)
            elif bookmarked.lower() == 'false':
                queryset = queryset.exclude(bookmarked_by=request.user)
    
    # Apply remaining filters
    queryset = queryset.filter(**filters)
    
    # Order by most recent first
    queryset = queryset.order_by('-publication_date', '-created_at')
    
    return queryset.distinct()

# Existing Research Paper views
class ResearchPaperPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 5000

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def research_paper_list(request):
    if request.method == 'GET':
        queryset = ResearchPaper.objects.all()
        filtered_queryset = apply_filters(queryset, request)
       
        paginator = ResearchPaperPagination()
        
        
        paginated_queryset = paginator.paginate_queryset(filtered_queryset, request)
        
        serializer = ResearchPaperSerializer(
            paginated_queryset, 
            many=True, 
            context={'request': request}
        )
        
        return paginator.get_paginated_response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ResearchPaperSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticatedOrReadOnly])
def research_paper_detail(request, pk):
    paper = get_object_or_404(ResearchPaper, pk=pk)
    
    if request.method == 'GET':
        serializer = ResearchPaperSerializer(paper, context={'request': request})
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = ResearchPaperSerializer(
            paper,
            data=request.data,
            partial=(request.method == 'PATCH'),
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if paper.paper_bookmarks.filter(is_active=True).exists():
            return Response(
                {"error": "Cannot delete paper with active bookmarks"},
                status=status.HTTP_400_BAD_REQUEST
            )
        paper.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# New Category views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def category_list(request):
    if request.method == 'GET':
        categories = ResearchPaperCategory.objects.all()
        serializer = CategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        serializer = CategorySerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticatedOrReadOnly])
def category_detail(request, pk):
    category = get_object_or_404(ResearchPaperCategory, pk=pk)
    
    if request.method == 'GET':
        serializer = CategorySerializer(category, context={'request': request})
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        if category.created_by != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
        serializer = CategorySerializer(
            category,
            data=request.data,
            partial=(request.method == 'PATCH'),
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if not request.user.is_authenticated:
            return Response(
                {'error': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        if category.created_by != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def toggle_category_like(request, pk):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    category = get_object_or_404(ResearchPaperCategory, pk=pk)
    like = CategoryLike.objects.filter(
        user=request.user,
        category=category,
        is_active=True
    ).first()
    
    if like:
        like.delete()  # This will trigger the soft delete
        return Response({'status': 'unliked'})
    else:
        like = CategoryLike.objects.create(
            user=request.user,
            category=category,
            is_active=True
        )
        serializer = CategoryLikeSerializer(like)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# Existing Bookmark views
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
    serializer = ResearchPaperSerializer(filtered_queryset, many=True, context={'request': request})
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
        bookmark.hard_delete()
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
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def category_listonly(request):
    """List all categories or create a new one"""
    if request.method == 'GET':
        categories = ResearchPaperCategory.objects.all()
        data = [{
            'id': cat.id,
            'name': cat.name,
            'icon': cat.icon,
            'description': cat.description,
            'like_count': cat.like_count,
            'created_at': cat.created_at
        } for cat in categories]
        return Response(data)

    elif request.method == 'POST':
        categories_data = request.data  # List of category dictionaries
        created_categories = []

        for category_data in categories_data:
            name = category_data.get('name')
            icon = category_data.get('icon')
            description = category_data.get('description')

            # Ensure required fields are provided
            if not name or not icon or not description:
                return Response({"error": "All fields (name, icon, description) are required."}, status=status.HTTP_400_BAD_REQUEST)

            category = ResearchPaperCategory.objects.create(
                name=name,
                icon=icon,
                description=description,
                created_by=request.user
            )

            created_categories.append({
                'id': category.id,
                'name': category.name,
                'icon': category.icon,
                'description': category.description,
                'like_count': 0,
                'created_at': category.created_at
            })
        
        return Response(created_categories, status=status.HTTP_201_CREATED)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def category_detailonly(request, pk):
    """Retrieve, update or delete a category"""
    category = get_object_or_404(ResearchPaperCategory, pk=pk)

    if request.method == 'GET':
        data = {
            'id': category.id,
            'name': category.name,
            'icon': category.icon,
            'description': category.description,
            'like_count': category.like_count,
            'created_at': category.created_at,
            'updated_at': category.updated_at
        }
        return Response(data)

    elif request.method == 'PUT':
        if category.created_by != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        category.name = request.data.get('name', category.name)
        category.icon = request.data.get('icon', category.icon)
        category.description = request.data.get('description', category.description)
        category.save()
        
        data = {
            'id': category.id,
            'name': category.name,
            'icon': category.icon,
            'description': category.description,
            'like_count': category.like_count,
            'updated_at': category.updated_at
        }
        return Response(data)

    elif request.method == 'DELETE':
        if category.created_by != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def category_like_list(request):
    """List all liked categories or like/unlike categories in bulk"""
    if request.method == 'GET':
        likes = CategoryLike.objects.filter(user=request.user, is_active=True)
        data = [{
            'id': like.category.id,
            'name': like.category.name,
            'icon': like.category.icon,
            'description': like.category.description,
            'like_count': like.category.like_count,
            'created_at': like.category.created_at
        } for like in likes]
        return Response(data)
    
    elif request.method == 'POST':
        category_ids = request.data.get('category_ids', [])  # List of category_ids from the request
        
        # Ensure category_ids is a list and not empty
        if not category_ids or not isinstance(category_ids, list):
            return Response({"error": "category_ids must be a non-empty list."}, status=status.HTTP_400_BAD_REQUEST)
        
        response_data = []
        
        for category_id in category_ids:
            category = get_object_or_404(ResearchPaperCategory, pk=category_id)
            like = CategoryLike.objects.filter(user=request.user, category=category, is_active=True).first()

            if like:
                # Unliking the category
                like.hard_delete()
                response_data.append({'category_id': category.id, 'status': 'unliked'})
            else:
                # Liking the category
                like = CategoryLike.objects.create(user=request.user, category=category, is_active=True)
                data = {
                    'id': like.category.id,
                    'name': like.category.name,
                    'icon': like.category.icon,
                    'description': like.category.description,
                    'like_count': like.category.like_count,
                    'created_at': like.category.created_at
                }
                response_data.append({'category_id': category.id, 'status': 'liked'})

        return Response(response_data, status=status.HTTP_200_OK)
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def summarization_paper(request, pdf_url=None):
    if request.method == 'POST':
        # Get the PDF URL frgit reset --hard HEAD~3om the frontend
        pdf_url = request.data.get('pdf_url', None)
        print(" PDF URL: ", pdf_url)

        if not pdf_url:
            return Response({"error": "PDF URL is required"}, status=status.HTTP_400_BAD_REQUEST)
        # Query the database for the research paper
        try:
            research_paper = ResearchPaper.objects.get(pdf_url=pdf_url)
        except ResearchPaper.DoesNotExist:
            return Response({"error": "Research paper not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            summary = summarize_pdf(pdf_url)  # This function should handle the summarization
        except Exception as e:
            return Response({"error": f"Summarization failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Prepare response data
        response_data = {
            "title": research_paper.title,
            "summary": summary,
            "pdf_url": pdf_url,
        }

        return Response(response_data, status=status.HTTP_200_OK)

    return Response({"error": "Invalid request method"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

def summarize_pdf(pdf_url):
    return "Summarized text"