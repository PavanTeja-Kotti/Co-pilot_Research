import os
import mimetypes
from datetime import datetime
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse

def create_upload_directory():
    """Create upload directory if it doesn't exist"""
    upload_dir = os.path.join(settings.BASE_DIR, 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    return upload_dir

def get_basic_metadata(file_path):
    """Get basic file metadata"""
    try:
        stats = os.stat(file_path)
        return {
            'file_size': stats.st_size,
            'created_at': datetime.fromtimestamp(stats.st_ctime).isoformat(),
            'modified_at': datetime.fromtimestamp(stats.st_mtime).isoformat(),
            'file_extension': os.path.splitext(file_path)[1],
            'filename': os.path.basename(file_path)
        }
    except Exception as e:
        return {'error': str(e)}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    """
    Upload file endpoint
    """
    try:
        # Check content type
        content_type = request.content_type or ''
        if not content_type.startswith('multipart/form-data'):
            return Response({
                'error': f'Content-Type must be multipart/form-data. Got {content_type}'
            }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        if 'file' not in request.FILES:
            return Response({
                'error': 'No file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        
        # Create upload directory if not exists
        upload_dir = create_upload_directory()
        
        # Generate unique filename
        unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uploaded_file.name}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        # Get file type using mimetypes
        file_type, _ = mimetypes.guess_type(file_path)
        if file_type is None:
            file_type = 'application/octet-stream'
        
        # Get metadata
        metadata = get_basic_metadata(file_path)
        
        return Response({
            'message': 'File uploaded successfully',
            'file_path': os.path.join('uploads', unique_filename),
            'file_type': file_type,
            'metadata': metadata
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_file(request, file_path):
    """
    Get file endpoint
    """
    try:
        # Create full path using BASE_DIR
        full_path = os.path.join(settings.BASE_DIR, file_path)        
        if not os.path.exists(full_path):
            return Response({
                'error': 'File not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get file type and metadata
        file_type, _ = mimetypes.guess_type(full_path)
        if file_type is None:
            file_type = 'application/octet-stream'
            
        metadata = get_basic_metadata(full_path)
        
        # Create response with metadata headers
        file = open(full_path, 'rb')
        response = FileResponse(file)
        response['Content-Type'] = file_type
        response['X-File-Size'] = metadata['file_size']
        response['X-Created-At'] = metadata['created_at']
        response['X-Modified-At'] = metadata['modified_at']
        response['Content-Disposition'] = f'attachment; filename="{metadata["filename"]}"'
        
        return response
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_file_info(request, file_path):
    """
    Get file information without downloading
    """
    try:
        full_path = os.path.join(settings.BASE_DIR, file_path)
        
        if not os.path.exists(full_path):
            return Response({
                'error': 'File not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get file type and metadata
        file_type, _ = mimetypes.guess_type(full_path)
        if file_type is None:
            file_type = 'application/octet-stream'
            
        metadata = get_basic_metadata(full_path)
        
        return Response({
            'file_type': file_type,
            'metadata': metadata
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)