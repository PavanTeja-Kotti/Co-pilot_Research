
import json
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
from django.db.models import Prefetch, Func, F
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import faiss
from collections import defaultdict
from functools import lru_cache
from typing import List, Dict, Set


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
        category_filters = Q()
        category_filters |= Q(categories__icontains=category)
        queryset = queryset.filter(category_filters)
    
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
    params = request.query_params
    model_name = queryset.model.__name__

    if model_name == 'ResearchPaper':
        if params.get('search'):
            queryset = queryset.filter(
                Q(title__icontains=params['search']) |
                Q(abstract__icontains=params['search']) |
                Q(authors__icontains=params['search'])
            )
        
        # Basic filters
        if params.get('title'):
            filters['title__icontains'] = params['title']
        if params.get('source'):
            filters['source'] = params['source']
            
        # Category filter with case-insensitive JSON handling
        if params.get('category'):
            category = params['category']
            categories = [category] if isinstance(category, str) else category
            q_objects = Q()
            for cat in categories:
                q_objects |= Q(categories__contains=f'"{cat}"')
            queryset = queryset.filter(q_objects)
                
        # Date filters
        if params.get('date_from'):
            filters['publication_date__gte'] = params['date_from']
        if params.get('date_to'):
            filters['publication_date__lte'] = params['date_to']
            
    elif model_name in ['BookmarkedPaper', 'ReadPaper', 'CategoryLike']:
        if params.get('search'):
            queryset = queryset.filter(
                Q(paper__title__icontains=params['search']) |
                Q(paper__abstract__icontains=params['search']) |
                Q(paper__authors__icontains=params['search'])
            )

        if params.get('user'):
            filters['user_id'] = params['user']
        if params.get('is_active') is not None:
            filters['is_active'] = params['is_active'] == 'True'
            
        # Date field handling
        date_field = {
            'BookmarkedPaper': 'bookmarked_at',
            'ReadPaper': 'read_at',
            'CategoryLike': 'created_at'
        }.get(model_name)
        
        if params.get('date_from'):
            filters[f'{date_field}__gte'] = params['date_from']
        if params.get('date_to'):
            filters[f'{date_field}__lte'] = params['date_to']
            
    elif model_name == 'ResearchPaperCategory':
        if params.get('title'):
            filters['name__icontains'] = params['title']

    # Apply remaining filters and sorting
    queryset = queryset.filter(**filters)
    
    if params.get('sort'):
        sort_field = params['sort'].lstrip('-')
        if hasattr(queryset.model, sort_field):
            queryset = queryset.order_by(params['sort'])
            
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
            # summary = summarize_pdf(pdf_url)  # This function should handle the summarization
            pass
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


import numpy as np
import faiss
from typing import List, Dict, Tuple
from collections import defaultdict
import math
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from django.db.models import Q, Count, F, Prefetch
from django.core.cache import cache
from sklearn.feature_extraction.text import TfidfVectorizer

from functools import reduce
import operator
CHUNK_SIZE = 2000
CACHE_TIMEOUT = 86400  # 24 hours
INDEX_DIMENSIONS = 200
MIN_INTERACTIONS = 5
MAX_WORKERS = 4

def process_categories(categories):
    if not categories:
        return ''
    try:
        return ','.join(str(cat).strip().lower() for cat in categories)
    except:
        return ''

def chunks(queryset, size):
    """Process queryset in chunks"""
    start = 0
    while True:
        chunk = list(queryset[start:start + size])
        if not chunk:
            break
        yield chunk
        start += size

class PaperIndexManager:
    def __init__(self):
        self.index = None
        self.paper_ids = []
        self.vectorizer = None
        self.load_from_cache()
    
    def load_from_cache(self):
        try:
            cached_data = cache.get('paper_index_data')
            if cached_data and isinstance(cached_data, dict):
                self.index = cached_data.get('index')
                self.paper_ids = cached_data.get('paper_ids', [])
                self.vectorizer = cached_data.get('vectorizer')
        except Exception as e:
            print(f"Cache loading error: {str(e)}")
    
    def save_to_cache(self):
        try:
            if self.index and self.vectorizer:
                cache.set('paper_index_data', {
                    'index': self.index,
                    'paper_ids': self.paper_ids,
                    'vectorizer': self.vectorizer
                }, CACHE_TIMEOUT)
        except Exception as e:
            print(f"Cache saving error: {str(e)}")

    def build_vectors(self, papers: List[Dict]) -> np.ndarray:
        texts = [
            f"{str(p.get('title', '')).lower()} {str(p.get('abstract', '')).lower()} "
            f"{process_categories(p.get('categories', []))} "
            f"{' '.join(str(author).lower() for author in p.get('authors', []))}"
            for p in papers
        ]
        
        try:
            if not self.vectorizer:
                self.vectorizer = TfidfVectorizer(
                    max_features=INDEX_DIMENSIONS,
                    stop_words='english',
                    ngram_range=(1, 3),
                    lowercase=True
                )
                vectors = self.vectorizer.fit_transform(texts).toarray()
            else:
                vectors = self.vectorizer.transform(texts).toarray()
                
            vectors = vectors.astype('float32')
            faiss.normalize_L2(vectors)
            return vectors
        except Exception as e:
            print(f"Vector building error: {str(e)}")
            raise

    def build_index(self, papers: List[Dict]):
        try:
            if not self.index:
                self.index = faiss.IndexFlatIP(INDEX_DIMENSIONS)
                self.paper_ids = []
            
            for i in range(0, len(papers), CHUNK_SIZE):
                chunk = papers[i:i + CHUNK_SIZE]
                vectors = self.build_vectors(chunk)
                self.index.add(vectors)
                self.paper_ids.extend(str(p.get('id')) for p in chunk)
            
            self.save_to_cache()
        except Exception as e:
            print(f"Index building error: {str(e)}")

def get_enhanced_content_recommendations(user_id: str) -> List[Tuple[str, float]]:
    index_manager = PaperIndexManager()
    
    try:
        # Get user interactions
        user_papers = ResearchPaper.objects.filter(
            Q(paper_bookmarks__user_id=user_id, paper_bookmarks__is_active=True) |
            Q(paper_readers__user_id=user_id, paper_readers__is_active=True)
        ).distinct()
        
        liked_categories = list(CategoryLike.objects.filter(
            user_id=user_id, 
            is_active=True
        ).values_list('category__name', flat=True))
        
        # Build user profile
        user_interests = defaultdict(float)
        user_keywords = defaultdict(float)
        user_authors = set()
        
        for paper in user_papers:
            text = f"{paper.title} {paper.abstract}"
            words = set(word.lower() for word in text.split() if len(word) > 3)
            user_keywords.update({word: user_keywords.get(word, 0) + 1 for word in words})
            
            for category in paper.categories:
                user_interests[category.lower()] += 0.4
            user_authors.update(paper.authors)
        
        for category in liked_categories:
            user_interests[category.lower()] += 0.6
        
        # Get unexplored categories
        all_categories = set(
            cat.lower() 
            for cats in ResearchPaper.objects.values_list('categories', flat=True)
            for cat in cats if cats
        )
        unexplored_categories = all_categories - set(user_interests.keys())
        
        # Initialize vectorizer if needed
        if not index_manager.index or not index_manager.vectorizer:
            papers = list(ResearchPaper.objects.values('id', 'title', 'abstract', 'categories', 'authors'))
            if papers:
                index_manager.build_index(papers)
        
        # Process recommendations with scores
        paper_scores = []
        seen_papers = {str(p.id) for p in user_papers}
        
        for papers in chunks(ResearchPaper.objects.exclude(id__in=seen_papers), 1000):
            for paper in papers:
                # Calculate interest-based score (70%)
                interest_score = calculate_interest_score(
                    paper, user_interests, user_keywords, 
                    user_authors, index_manager
                )
                
                # Calculate diversity score (30%)
                diversity_score = calculate_diversity_score(
                    paper, unexplored_categories
                )
                
                final_score = (interest_score * 0.7) + (diversity_score * 0.3)
                if final_score > 0:
                    paper_scores.append((str(paper.id), round(final_score, 4)))
        
        # Sort recommendations
        return sorted(paper_scores, key=lambda x: x[1], reverse=True)
        
    except Exception as e:
        print(f"Recommendation error: {str(e)}")
        return []
def calculate_interest_score(paper, user_interests, user_keywords, user_authors, index_manager):
    score = 0
    
    # Category match (30%)
    paper_categories = [cat.lower() for cat in paper.categories]
    category_score = sum(user_interests.get(cat, 0) for cat in paper_categories)
    score += category_score * 0.3
    
    # Keyword similarity (25%)
    text = f"{paper.title.lower()} {paper.abstract.lower()}"
    words = set(word for word in text.split() if len(word) > 3)
    keyword_score = sum(user_keywords.get(word, 0) for word in words) / (len(words) or 1)
    score += keyword_score * 0.25
    
    # Content similarity (25%)
    if str(paper.id) in index_manager.paper_ids:
        try:
            idx = index_manager.paper_ids.index(str(paper.id))
            similarity_score = index_manager.index.reconstruct(idx).mean()
            score += similarity_score * 0.25
        except:
            pass
    
    # Citation impact (10%)
    citation_score = min(math.log(paper.citation_count + 1) / 10, 1) if paper.citation_count else 0
    score += citation_score * 0.1
    
    # Recency (10%)
    days_old = (datetime.now().date() - paper.publication_date).days
    recency_score = math.exp(-days_old / 365) if days_old >= 0 else 0
    score += recency_score * 0.1
    
    # Author overlap bonus
    if any(author in paper.authors for author in user_authors):
        score *= 1.2
        
    return score

def calculate_diversity_score(paper, unexplored_categories):
    paper_categories = set(cat.lower() for cat in paper.categories)
    unexplored_matches = len(paper_categories & unexplored_categories)
    
    if unexplored_matches:
        citation_weight = min(math.log(paper.citation_count + 1) / 10, 1) if paper.citation_count else 0.1
        return (unexplored_matches / len(paper_categories)) * citation_weight
    return 0

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommendation_paper(request):
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    search_query = request.GET.get('search', '').strip().lower()
    categories = [cat.lower() for cat in request.GET.getlist('categories', [])]
    
    cache_key = f'recommendations_{request.user.id}'
    recommended_data = cache.get(cache_key)
    
    if recommended_data is None:
        recommended_data = get_enhanced_content_recommendations(str(request.user.id))
        if recommended_data:
            cache.set(cache_key, recommended_data, CACHE_TIMEOUT)
    
    if not recommended_data:
        return Response([])

    # Split IDs and scores
    recommended_ids, scores = zip(*recommended_data) if recommended_data else ([], [])
    recommendations = ResearchPaper.objects.filter(id__in=recommended_ids)
    
    if search_query:
        recommendations = recommendations.filter(
            Q(title__icontains=search_query) |
            Q(abstract__icontains=search_query)
        )
    
    if categories:
        recommendations = recommendations.filter(
            reduce(operator.or_, 
                  [Q(categories__icontains=cat) for cat in categories])
        )
    
    recommendations = recommendations.prefetch_related(
        Prefetch(
            'paper_bookmarks',
            queryset=BookmarkedPaper.objects.filter(
                user=request.user,
                is_active=True
            ),
            to_attr='user_bookmarks'
        ),
        Prefetch(
            'paper_readers',
            queryset=ReadPaper.objects.filter(
                user=request.user,
                is_active=True
            ),
            to_attr='user_reads'
        )
    )
    
    # Create a mapping of paper IDs to their scores
    score_map = dict(recommended_data)
    
    # Sort recommendations and attach scores
    recommendations = sorted(
        recommendations,
        key=lambda x: score_map.get(str(x.id), 0),
        reverse=True
    )
    
    paginator = ResearchPaperPagination()
    page = paginator.paginate_queryset(recommendations, request)
    
    # Serialize papers and add recommendation scores
    serialized_papers = ResearchPaperSerializer(page, many=True, context={'request': request}).data
    for paper in serialized_papers:
        paper['recommendation_score'] = score_map.get(paper['id'], 0)
    
    return paginator.get_paginated_response(serialized_papers)