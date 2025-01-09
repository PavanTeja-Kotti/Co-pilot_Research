# Generated by Django 5.1.4 on 2025-01-09 10:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scraping', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CategoryLike',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='user_category_likes', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='ResearchPaperCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('icon', models.CharField(max_length=50)),
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