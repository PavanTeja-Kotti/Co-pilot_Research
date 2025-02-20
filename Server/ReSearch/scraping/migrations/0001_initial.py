# Generated by Django 5.1.4 on 2025-01-15 14:13

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BookmarkedPaper',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('bookmarked_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='user_bookmarks', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-bookmarked_at'],
            },
        ),
        migrations.CreateModel(
            name='CategoryLike',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='user_category_likes', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='ResearchPaper',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=500)),
                ('abstract', models.TextField()),
                ('authors', models.JSONField()),
                ('source', models.CharField(max_length=50)),
                ('url', models.URLField()),
                ('pdf_url', models.URLField(blank=True, null=True)),
                ('categories', models.JSONField(default=list)),
                ('publication_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('bookmarked_by', models.ManyToManyField(related_name='bookmarked_papers', through='scraping.BookmarkedPaper', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-publication_date'],
            },
        ),
        migrations.AddField(
            model_name='bookmarkedpaper',
            name='paper',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='paper_bookmarks', to='scraping.researchpaper'),
        ),
        migrations.CreateModel(
            name='ResearchPaperCategory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('icon', models.TextField(blank=True, null=True)),
                ('description', models.TextField()),
                ('like_count', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_categories', to=settings.AUTH_USER_MODEL)),
                ('likes', models.ManyToManyField(related_name='liked_categories', through='scraping.CategoryLike', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Research Paper Categories',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='categorylike',
            name='category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='category_likes', to='scraping.researchpapercategory'),
        ),
        migrations.AddIndex(
            model_name='researchpaper',
            index=models.Index(fields=['-publication_date'], name='scraping_re_publica_47e26b_idx'),
        ),
        migrations.AddIndex(
            model_name='researchpaper',
            index=models.Index(fields=['source'], name='scraping_re_source_a2cf32_idx'),
        ),
        migrations.AddIndex(
            model_name='bookmarkedpaper',
            index=models.Index(fields=['user', 'is_active'], name='scraping_bo_user_id_d01b80_idx'),
        ),
        migrations.AddIndex(
            model_name='bookmarkedpaper',
            index=models.Index(fields=['paper', 'is_active'], name='scraping_bo_paper_i_3ceaa5_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='bookmarkedpaper',
            unique_together={('user', 'paper')},
        ),
        migrations.AddIndex(
            model_name='researchpapercategory',
            index=models.Index(fields=['name'], name='scraping_re_name_d0060c_idx'),
        ),
        migrations.AddIndex(
            model_name='researchpapercategory',
            index=models.Index(fields=['created_by'], name='scraping_re_created_528c3f_idx'),
        ),
        migrations.AddIndex(
            model_name='researchpapercategory',
            index=models.Index(fields=['-like_count'], name='scraping_re_like_co_2f3a94_idx'),
        ),
        migrations.AddIndex(
            model_name='categorylike',
            index=models.Index(fields=['user', 'is_active'], name='scraping_ca_user_id_767629_idx'),
        ),
        migrations.AddIndex(
            model_name='categorylike',
            index=models.Index(fields=['category', 'is_active'], name='scraping_ca_categor_ad7d9d_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='categorylike',
            unique_together={('user', 'category')},
        ),
    ]
