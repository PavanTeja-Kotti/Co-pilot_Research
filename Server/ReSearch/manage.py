#!/usr/bin/env python
import inspect
import os
import sys

# Monkey-patch inspect.getargspec to use inspect.getfullargspec if not present
if not hasattr(inspect, "getargspec"):
    def getargspec(func):
        return inspect.getfullargspec(func)
    inspect.getargspec = getargspec


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ReSearch.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
