# Generated by Django 5.1.4 on 2025-01-10 06:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scraping', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='researchpapercategory',
            name='icon',
            field=models.TextField(blank=True, null=True),
        ),
    ]
