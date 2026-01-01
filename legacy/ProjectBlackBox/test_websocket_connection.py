
import asyncio
import websockets
import json

async def test_connection():
    uri = "ws://localhost:8765"
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket server")
        # Send a simple message (optional, but good for testing handler logic)
        # The server expects JSON
        msg = {"type": "session_info", "session_id": "test_session", "data": {}}
        await websocket.send(json.dumps(msg))
        print("Sent test message")
        # Wait a bit
        await asyncio.sleep(0.5)
        print("Closing connection")

if __name__ == "__main__":
    try:
        asyncio.run(test_connection())
        print("Test passed!")
    except Exception as e:
        print(f"Test failed: {e}")
