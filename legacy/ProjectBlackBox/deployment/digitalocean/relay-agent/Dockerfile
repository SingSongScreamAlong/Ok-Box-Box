FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Create requirements.txt with cloud dependencies (no pyirsdk needed)
RUN echo "websockets==11.0.3" > requirements.txt && \
    echo "websocket-client==1.6.4" >> requirements.txt && \
    echo "requests==2.31.0" >> requirements.txt && \
    echo "numpy==1.24.3" >> requirements.txt && \
    echo "pillow==10.0.1" >> requirements.txt && \
    echo "psutil==5.9.5" >> requirements.txt && \
    echo "asyncio" >> requirements.txt && \
    echo "json5==0.9.14" >> requirements.txt && \
    echo "redis==4.5.4" >> requirements.txt && \
    echo "openai==1.3.0" >> requirements.txt && \
    echo "elevenlabs==0.2.24" >> requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /root/BlackBoxRelay/logs /root/BlackBoxRelay/config /root/BlackBoxRelay/data

# Copy relay agent source code
COPY relay_agent/ .

# Create default config
RUN echo '{"port": 8081, "host": "0.0.0.0", "debug": false}' > /root/BlackBoxRelay/config/config.json

# Expose port
EXPOSE 8081

# Run the relay agent
CMD ["python", "agent_main.py"]
