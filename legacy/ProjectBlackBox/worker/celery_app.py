import os
from celery import Celery

# Get Redis URL from environment or default to localhost
broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

app = Celery('pitbox_worker', broker=broker_url, backend=result_backend)

# Configure Celery
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# Auto-discover tasks
app.autodiscover_tasks(['worker.tasks'])

if __name__ == '__main__':
    app.start()
