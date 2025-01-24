
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.pagination import LimitOffsetPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import pandas as pd
import asyncio
from django.core.cache import cache
from django.db import models
from django.db.models import Q,Case, When, Value, IntegerField
from .models import ResearchPaper, BookmarkedPaper, ResearchPaperCategory, CategoryLike,ReadPaper
from .serializers import (
    ResearchPaperSerializer, 
    BookmarkedPaperSerializer,
    CategorySerializer,
    CategoryLikeSerializer,
    ReadPaperSerializer
)
from collections import Counter

from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Count, Avg
from django.db.models.functions import TruncMonth, ExtractMonth, Lower


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def statsData(request):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Dates for current and previous month
    now = datetime.now()
    first_day_this_month = datetime(now.year, now.month, 1)
    last_day_last_month = first_day_this_month - timedelta(days=1)
    first_day_last_month = datetime(last_day_last_month.year, last_day_last_month.month, 1)

    # Filter papers for this month and last month
    readPapersThisMonth = ReadPaper.objects.filter(
        user=request.user, 
        read_at__gte=first_day_this_month
    )
    readPapersLastMonth = ReadPaper.objects.filter(
        user=request.user, 
        read_at__gte=first_day_last_month,
        read_at__lt=first_day_this_month
    )

    # Metrics for this month
    readPapersCountThisMonth = readPapersThisMonth.count()
    totalCitationCountThisMonth = readPapersThisMonth.aggregate(total=Sum('paper__citation_count'))['total'] or 0
    avgReadingTimeThisMonth = readPapersThisMonth.aggregate(avg=Avg('paper__average_reading_time'))['avg'] or 0

    # Metrics for last month
    readPapersCountLastMonth = readPapersLastMonth.count()
    totalCitationCountLastMonth = readPapersLastMonth.aggregate(total=Sum('paper__citation_count'))['total'] or 0
    avgReadingTimeLastMonth = readPapersLastMonth.aggregate(avg=Avg('paper__average_reading_time'))['avg'] or 0

    # Calculate Impact Score
    impactScoreThisMonth = (
        totalCitationCountThisMonth * 0.5
        + avgReadingTimeThisMonth * 0.3
        + readPapersCountThisMonth * 0.2
    )
    impactScoreLastMonth = (
        totalCitationCountLastMonth * 0.5
        + avgReadingTimeLastMonth * 0.3
        + readPapersCountLastMonth * 0.2
    )

    # Helper to calculate trend and percentage change
    def calculate_trend_and_percentage(current, previous):
        trend = "up" if current > previous else "down"
        if previous == 0:
            percentage_change = "0"  # Avoid division by zero
        else:
            percentage_change = f"{((current - previous) / previous) * 100:.1f}%"
        return trend, percentage_change

    # Calculate trends and percentage changes
    readPapersTrend, readPapersPercentage = calculate_trend_and_percentage(
        readPapersCountThisMonth, readPapersCountLastMonth
    )
    avgReadingTimeTrend, avgReadingTimePercentage = calculate_trend_and_percentage(
        avgReadingTimeThisMonth, avgReadingTimeLastMonth
    )
    citationTrend, citationPercentage = calculate_trend_and_percentage(
        totalCitationCountThisMonth, totalCitationCountLastMonth
    )
    impactScoreTrend, impactScorePercentage = calculate_trend_and_percentage(
        impactScoreThisMonth, impactScoreLastMonth
    )

    # Construct the response data
    data = [
        {
            "title": "Papers Read This Month",
            "value": readPapersCountThisMonth,
            "prefix": "BookOutlined",
            "suffix": readPapersPercentage,
            "trend": readPapersTrend
        },
        {
            "title": "Average Reading Time",
            "value": f"{avgReadingTimeThisMonth:.1f}h",
            "prefix": "ClockCircleOutlined",
            "suffix": avgReadingTimePercentage,
            "trend": avgReadingTimeTrend
        },
        {
            "title": "Total Citations",
            "value": f"{totalCitationCountThisMonth / 1000:.1f}k",
            "prefix": "StarOutlined",
            "suffix": citationPercentage,
            "trend": citationTrend
        },
        {
            "title": "Impact Score",
            "value": f"{impactScoreThisMonth:.1f}",
            "prefix": "FireOutlined",
            "suffix": impactScorePercentage,
            "trend": impactScoreTrend
        }
    ]

    return Response(data, status=status.HTTP_200_OK)




@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def readPaper(request):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    queryset = ReadPaper.objects.filter(user=request.user)
    serializer = ReadPaperSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def toggle_readPaper(request, pk):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    paper = get_object_or_404(ResearchPaper, pk=pk)
    read = ReadPaper.objects.filter(
        user=request.user,
        paper=paper,
        is_active=True
    ).first()
    if read:
        read.hard_delete()
        return Response({'status': 'unRead'})
    else:
        read = ReadPaper.objects.create(
            user=request.user,
            paper=paper,
            notes=request.data.get('notes', ''),
            is_active=True
        )
        serializer = ReadPaperSerializer(read)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
# Helper function to apply filters to queryset
   
    


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
def research_paper_list_withPage(request):
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



def apply_dynamic_filters(queryset, request):
    filters = {}
    
    title = request.query_params.get('title')
    source = request.query_params.get('source')
    category = request.query_params.get('category')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    is_active = request.query_params.get('is_active')
    user = request.query_params.get('user')
    sort = request.query_params.get('sort')
    search= request.query_params.get('search')
    
    model_name = queryset.model.__name__

    if model_name == 'ResearchPaper':
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(abstract__icontains=search) |
                Q(authors__icontains=search)
            )
        
        if title:
            filters['title__icontains'] = title
        if source:
            filters['source'] = source
        if category:
            filters['categories__contains'] = [category]
        if date_from:
            filters['publication_date__gte'] = date_from
        if date_to:
            filters['publication_date__lte'] = date_to
            
    elif model_name in ['BookmarkedPaper', 'ReadPaper', 'CategoryLike']:

        if search:
            queryset = queryset.filter(
                Q(paper__title__icontains=search) |
                Q(paper__abstract__icontains=search) |
                Q(paper__authors__icontains=search)
            )

        if user:
            filters['user_id'] = user
        if is_active is not None:
            filters['is_active'] = is_active == 'True'
        if date_from:
            date_field = 'bookmarked_at' if model_name == 'BookmarkedPaper' else 'read_at' if model_name == 'ReadPaper' else 'created_at'
            filters[f'{date_field}__gte'] = date_from
        if date_to:
            date_field = 'bookmarked_at' if model_name == 'BookmarkedPaper' else 'read_at' if model_name == 'ReadPaper' else 'created_at'
            filters[f'{date_field}__lte'] = date_to
            
    elif model_name == 'ResearchPaperCategory':
        if title:
            filters['name__icontains'] = title

    # Apply filters to queryset
    queryset = queryset.filter(**filters)
    
    # Apply sorting
    if sort:
        sort_field = sort.lstrip('-')
        if hasattr(queryset.model, sort_field):
            queryset = queryset.order_by(sort)
            
    return queryset
    

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def dynamic_paper_list(request):
    Table= request.query_params.get('Table')
    Topic= request.query_params.get('Topic')
    Sort= request.query_params.get('Sort')
    pagginated= request.query_params.get('pagginated')
    limit= request.query_params.get('limit')
    offset= request.query_params.get('offset')

    if Table ==   'ResearchPaper':
        queryset = ResearchPaper.objects.all()
    elif Table == 'BookmarkedPaper':
        queryset = BookmarkedPaper.objects.all()
    elif Table == 'ResearchPaperCategory':
        queryset = ResearchPaperCategory.objects.all()
    elif Table == 'CategoryLike':
        queryset = CategoryLike.objects.all()
    elif Table == 'ReadPaper':
        queryset = ReadPaper.objects.all()
    else:
        return Response({"error": "Table not found"}, status=status.HTTP_404_NOT_FOUND)
    
    filtered_queryset = apply_dynamic_filters(queryset, request)

    if pagginated == 'True':
        paginator = ResearchPaperPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        if Table == 'ResearchPaper':
            serializer = ResearchPaperSerializer(
                paginated_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'BookmarkedPaper':
            serializer = BookmarkedPaperSerializer(
                paginated_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'ResearchPaperCategory':
            serializer = CategorySerializer(
                paginated_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'CategoryLike':
            serializer = CategoryLikeSerializer(
                paginated_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'ReadPaper':
            serializer = ReadPaperSerializer(
                paginated_queryset, 
                many=True, 
                context={'request': request}
            )
        return paginator.get_paginated_response(serializer.data)

    else:
        if Table == 'ResearchPaper':
            serializer = ResearchPaperSerializer(
                filtered_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'BookmarkedPaper':
            serializer = BookmarkedPaperSerializer(
                filtered_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'ResearchPaperCategory':
            serializer = CategorySerializer(
                filtered_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'CategoryLike':
            serializer = CategoryLikeSerializer(
                filtered_queryset, 
                many=True, 
                context={'request': request}
            )
        elif Table == 'ReadPaper':
            serializer = ReadPaperSerializer(
                filtered_queryset, 
                many=True, 
                context={'request': request}
            )
        return Response(serializer.data)

        

       
    
       

    


    

    

   



@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def research_paper_list_withoutPage(request):
   cache_key = f"research_papers_{request.query_params}"
   cached_data = cache.get(cache_key)
   
   if cached_data:
       return Response(cached_data)
   
   # Track cache key
   related_keys = cache.get("research_paper_cache_keys", set())
   related_keys.add(cache_key)
   cache.set("research_paper_cache_keys", related_keys)
   
   queryset = ResearchPaper.objects.all()
   queryset = apply_filters(queryset, request)
   
   queryset = queryset.only(
       'id', 'title', 'abstract', 'authors', 'source', 'url',
       'pdf_url', 'categories', 'publication_date', 'created_at'
   )
   
   # More efficient chunking using iterator()
   chunk_size = 1000
   all_data = []
   
   for chunk in queryset.iterator(chunk_size=chunk_size):
       serializer = ResearchPaperSerializer([chunk], many=True)
       all_data.extend(serializer.data)
   
   cache.set(cache_key, all_data, timeout=604800)
   return Response(all_data)

def capitalize_categories(category):
   words = category.lower().split()
   return ' '.join(word.capitalize() for word in words)

@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def research_focus(request):
   cache_key = "research_focus_stats"
   cached_data = cache.get(cache_key)

   if cached_data:
       return Response(cached_data)

   papers = ResearchPaper.objects.all()
   total_papers = len(papers)
   
   category_counts = {}
   for paper in papers:
       for category in paper.categories:
           formatted_category = capitalize_categories(category)
           category_counts[formatted_category] = category_counts.get(formatted_category, 0) + 1

   distribution = [
       {
           "category": cat,
           "count": count,
           "percentage": round((count / total_papers) * 100, 1)
       }
       for cat, count in sorted(category_counts.items(), 
                              key=lambda x: x[1], 
                              reverse=True)
   ]

   response_data = {
       "research_focus": {
           "topic_distribution": distribution,
           "total_papers": total_papers,
           "total_categories": len(category_counts)
       }
   }

   cache.set(cache_key, response_data, timeout=604800)
   related_keys = cache.get("research_focus_cache_keys", set())
   related_keys.add(cache_key)
   cache.set("research_focus_cache_keys", related_keys)

   return Response(response_data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reading_stats(request):
    """
    Get reading statistics by month for the authenticated user.
    Query Parameters:
        - year: Optional. Filter stats by year (defaults to current year)
    """
    # Get the current year or specified year from query params
    year = request.query_params.get('year', timezone.now().year)
    
    # Get reading stats for the user
    monthly_stats = (
        ReadPaper.objects
        .filter(
            user=request.user,
            is_active=True,
            read_at__year=year
        )
        .annotate(
            month=TruncMonth('read_at')
        )
        .values('month')
        .annotate(
            papers=Count('id'),
            avgTime=Avg('paper__average_reading_time')
        )
        .order_by('month')
    )

    # Format the data to match the required structure
    formatted_stats = []
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
             'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    # Create a dictionary of existing data
    stats_dict = {
        stat['month'].month: {
            'papers': stat['papers'],
            'avgTime': round(stat['avgTime'], 1) if stat['avgTime'] else 0
        }
        for stat in monthly_stats
    }
    
    # Fill in all months, using 0 for months with no data
    for month_num, month_name in enumerate(months, 1):
        month_data = stats_dict.get(month_num, {'papers': 0, 'avgTime': 0})
        formatted_stats.append({
            'month': month_name,
            'papers': month_data['papers'],
            'avgTime': month_data['avgTime']
        })

    return Response(formatted_stats, status=status.HTTP_200_OK)

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
    
    # Get the bookmarks for the authenticated user
    bookmarks = BookmarkedPaper.objects.filter(user=request.user, is_active=True)
    
    # Serialize the bookmarks using the BookmarkedPaperSerializer
    serializer = BookmarkedPaperSerializer(bookmarks, many=True)
    
    return Response(serializer.data, status=status.HTTP_200_OK)


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

def process_categories(categories):
    if isinstance(categories, str):  # If it's a string (e.g., "['AI', 'Machine Learning']")
        categories = eval(categories)  # Convert string to a list
    if isinstance(categories, list):  # If it's a list
        return ', '.join([cat.strip().lower() for cat in categories])
    return ''  # Default to an empty string if neither

def chunked_queryset(queryset, ids, chunk_size=900):
    """
    Breaks down a large list of IDs into smaller chunks to avoid exceeding SQLite's variable limit.
    """
    chunks = [ids[i:i + chunk_size] for i in range(0, len(ids), chunk_size)]
    q_objects = Q()
    for chunk in chunks:
        q_objects |= Q(id__in=chunk)
    return queryset.filter(q_objects)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def recommendation_paper(request):
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    # Fetch read paper IDs and user interests
    read_paper_ids = list(ReadPaper.objects.filter(user=request.user).values_list('paper_id', flat=True))
    user_interests = list(CategoryLike.objects.filter(user=request.user, is_active=True).values_list('category__name', flat=True))

    # Normalize user interests
    normalized_interests = [interest.strip().lower() for interest in user_interests]

    # Fetch all research papers
    queryset = ResearchPaper.objects.all()
    papers_df = pd.DataFrame(list(queryset.values()))

    # Preprocess categories column
    papers_df['categories'] = papers_df['categories'].apply(process_categories)
    papers_df['combined_text'] = papers_df['title'] + ' ' + papers_df['abstract'] + ' ' + papers_df['categories']

    tfidf_vectorizer = TfidfVectorizer()
    tfidf_matrix = tfidf_vectorizer.fit_transform(papers_df['combined_text'].tolist())

    if not read_paper_ids:
        # Recommend based on user interests
        user_profile = ' '.join(normalized_interests)
        user_profile_tfidf = tfidf_vectorizer.transform([user_profile])
        cosine_similarities = cosine_similarity(user_profile_tfidf, tfidf_matrix).flatten()
        papers_df['similarity_score'] = cosine_similarities
    else:
        # Recommend based on read papers
        similarity_scores = cosine_similarity(tfidf_matrix)
        user_indices = [papers_df[papers_df['id'] == paper_id].index[0] for paper_id in read_paper_ids if not papers_df[papers_df['id'] == paper_id].empty]
        
        if not user_indices:
            return Response({'error': 'No valid papers in user history'}, status=status.HTTP_400_BAD_REQUEST)

        mean_similarity_scores = np.mean(similarity_scores[user_indices], axis=0)
        papers_df['similarity_score'] = mean_similarity_scores

    # Filter out already read papers and sort by similarity score
    recommendations = papers_df[~papers_df['id'].isin(read_paper_ids)].sort_values(by='similarity_score', ascending=False).reset_index(drop=True)
    
    recommendations_ids = recommendations['id'].tolist()

    # Retrieve objects in the same order as recommendations_ids using an in-memory sort
    recommendations_queryset = list(ResearchPaper.objects.filter(id__in=recommendations_ids))
    recommendations_queryset.sort(key=lambda x: recommendations_ids.index(x.id))

    paginator = ResearchPaperPagination()
    
    paginated_queryset = paginator.paginate_queryset(recommendations_queryset, request)
    
    serializer = ResearchPaperSerializer(paginated_queryset, many=True, context={'request': request})
    
    return paginator.get_paginated_response(serializer.data)

def summarize_pdf(pdf_url):
    return "Summarized text"