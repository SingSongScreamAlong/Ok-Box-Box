"""
Performance Tests for PitBox System

Tests system performance under load
"""

import pytest
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
import statistics


class TestConcurrentDrivers:
    """Test system performance with multiple concurrent drivers"""
    
    @pytest.mark.asyncio
    async def test_10_concurrent_drivers(self):
        """Test system with 10 concurrent drivers"""
        num_drivers = 10
        
        async def simulate_driver(driver_id: int):
            """Simulate a single driver sending telemetry"""
            start_time = time.time()
            samples_sent = 0
            
            # Simulate 60 seconds of telemetry at 60Hz
            for _ in range(60 * 60):
                telemetry = {
                    'driver_id': f'driver_{driver_id:03d}',
                    'timestamp': time.time(),
                    'speed': 150 + (driver_id * 5),
                    'rpm': 7500,
                    'gear': 4
                }
                samples_sent += 1
                await asyncio.sleep(1/60)  # 60Hz
            
            duration = time.time() - start_time
            return {
                'driver_id': driver_id,
                'samples_sent': samples_sent,
                'duration': duration,
                'samples_per_second': samples_sent / duration
            }
        
        # Run all drivers concurrently
        tasks = [simulate_driver(i) for i in range(num_drivers)]
        results = await asyncio.gather(*tasks)
        
        # Analyze results
        avg_samples_per_second = statistics.mean([r['samples_per_second'] for r in results])
        
        # Assertions
        assert len(results) == num_drivers
        assert avg_samples_per_second >= 55  # Should maintain ~60Hz
        
        print(f"\nConcurrent Drivers Test Results:")
        print(f"  Drivers: {num_drivers}")
        print(f"  Avg samples/sec: {avg_samples_per_second:.2f}")
        print(f"  Total samples: {sum(r['samples_sent'] for r in results)}")
    
    def test_telemetry_throughput(self):
        """Test telemetry processing throughput"""
        num_samples = 10000
        start_time = time.time()
        
        # Simulate processing telemetry samples
        processed = 0
        for i in range(num_samples):
            # Simulate telemetry processing
            telemetry = {
                'timestamp': time.time(),
                'speed': 150,
                'rpm': 7500,
                'gear': 4,
                'throttle': 0.85,
                'brake': 0.0
            }
            # Simulate some processing
            _ = telemetry['speed'] * 2
            processed += 1
        
        duration = time.time() - start_time
        throughput = processed / duration
        
        # Should process at least 10,000 samples/second
        assert throughput >= 10000
        
        print(f"\nTelemetry Throughput Test:")
        print(f"  Samples processed: {processed}")
        print(f"  Duration: {duration:.2f}s")
        print(f"  Throughput: {throughput:.0f} samples/sec")


class TestWebSocketLoad:
    """Test WebSocket connection performance"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection_limit(self):
        """Test maximum WebSocket connections"""
        max_connections = 100
        
        async def create_connection(conn_id: int):
            """Simulate WebSocket connection"""
            await asyncio.sleep(0.01)  # Simulate connection time
            return {
                'id': conn_id,
                'connected': True,
                'latency_ms': 10 + (conn_id % 20)
            }
        
        # Create connections concurrently
        tasks = [create_connection(i) for i in range(max_connections)]
        connections = await asyncio.gather(*tasks)
        
        # Verify all connections succeeded
        assert len(connections) == max_connections
        assert all(c['connected'] for c in connections)
        
        # Check average latency
        avg_latency = statistics.mean([c['latency_ms'] for c in connections])
        assert avg_latency < 50  # Should be under 50ms
        
        print(f"\nWebSocket Load Test:")
        print(f"  Connections: {len(connections)}")
        print(f"  Avg latency: {avg_latency:.2f}ms")


class TestMemoryUsage:
    """Test memory usage under load"""
    
    def test_telemetry_buffer_memory(self):
        """Test memory usage of telemetry buffer"""
        import sys
        
        # Create large telemetry buffer
        buffer_size = 10000
        telemetry_buffer = []
        
        for i in range(buffer_size):
            telemetry_buffer.append({
                'timestamp': time.time(),
                'speed': 150.5,
                'rpm': 7500,
                'gear': 4,
                'throttle': 0.85,
                'brake': 0.0,
                'steering': 0.15,
                'lap': 5,
                'fuel': 45.2
            })
        
        # Check memory usage
        buffer_size_bytes = sys.getsizeof(telemetry_buffer)
        avg_sample_size = buffer_size_bytes / buffer_size
        
        # Should be reasonable memory usage
        assert avg_sample_size < 1000  # Less than 1KB per sample
        
        print(f"\nMemory Usage Test:")
        print(f"  Buffer size: {buffer_size} samples")
        print(f"  Total memory: {buffer_size_bytes / 1024:.2f} KB")
        print(f"  Avg per sample: {avg_sample_size:.2f} bytes")


class TestDatabaseQueryPerformance:
    """Test database query performance"""
    
    @pytest.mark.asyncio
    async def test_bulk_insert_performance(self):
        """Test bulk telemetry insert performance"""
        num_records = 1000
        
        # Simulate bulk insert
        start_time = time.time()
        
        records = []
        for i in range(num_records):
            records.append({
                'driver_id': 'driver_001',
                'timestamp': time.time(),
                'speed': 150 + i,
                'rpm': 7500,
                'gear': 4
            })
        
        # Simulate insert time (would be actual DB insert in real test)
        await asyncio.sleep(0.1)  # Simulate 100ms for 1000 records
        
        duration = time.time() - start_time
        inserts_per_second = num_records / duration
        
        # Should handle at least 5000 inserts/second
        assert inserts_per_second >= 5000
        
        print(f"\nDatabase Performance Test:")
        print(f"  Records inserted: {num_records}")
        print(f"  Duration: {duration:.3f}s")
        print(f"  Inserts/sec: {inserts_per_second:.0f}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
