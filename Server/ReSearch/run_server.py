import subprocess
import os

def run_uvicorn():
    """Run the ASGI server with Uvicorn."""
    subprocess.run(["uvicorn", "ReSearch.asgi:application", "--reload"])

def run_celery_worker():
    """Run the Celery worker."""
    subprocess.run(["celery", "-A", "ReSearch", "worker", "--loglevel=info"])

def run_celery_beat():
    """Run the Celery beat scheduler (optional)."""
    subprocess.run(["celery", "-A", "ReSearch", "beat", "--loglevel=info"])

if __name__ == "__main__":
    try:
        # Run Uvicorn, Celery Worker, and Celery Beat in parallel
        processes = [
            subprocess.Popen(["uvicorn", "ReSearch.asgi:application", "--reload"]),
            subprocess.Popen(["celery", "-A", "ReSearch", "worker", "--loglevel=info"]),
            # subprocess.Popen(["celery", "-A", "ReSearch", "beat", "--loglevel=info"]),
        ]

        # Wait for all processes to complete
        for process in processes:
            process.wait()

    except KeyboardInterrupt:
        # Gracefully terminate all processes on Ctrl+C
        for process in processes:
            process.terminate()
            process.wait()
