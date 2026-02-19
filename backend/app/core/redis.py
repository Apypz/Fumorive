"""
Redis Connection Manager
Handles Redis connection pool and provides connection access
Week 2, Wednesday - Redis Session Caching
"""

import redis
from typing import Optional
from app.core.config import settings


# Global Redis connection pool
_redis_pool: Optional[redis.ConnectionPool] = None
_redis_client: Optional[redis.Redis] = None


def init_redis() -> redis.Redis:
    """
    Initialize Redis connection pool
    Call this on application startup
    
    Returns:
        Redis client instance
    """
    global _redis_pool, _redis_client
    
    try:
        # Create connection pool
        _redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,  # Auto-decode bytes to strings
            max_connections=10,
            socket_connect_timeout=5,
            socket_keepalive=True
        )
        
        # Create Redis client
        _redis_client = redis.Redis(connection_pool=_redis_pool)
        
        # Test connection
        _redis_client.ping()
        print(f"[OK] Redis connected: {settings.REDIS_URL}")
        
        return _redis_client
        
    except redis.ConnectionError as e:
        print(f"[WARN]  Redis connection failed: {e}")
        print("    Application will run without Redis caching")
        return None
    except Exception as e:
        print(f"[WARN]  Redis initialization error: {e}")
        return None


def get_redis() -> Optional[redis.Redis]:
    """
    Get Redis client instance with lazy reconnect.

    If the previous connection is stale (Redis was restarted or temporarily
    unavailable), this function attempts a single reconnect before returning
    None so callers can degrade gracefully instead of raising HTTP 500.

    Returns:
        Redis client if connected, None otherwise

    Example:
        r = get_redis()
        if r:
            r.set('key', 'value')
    """
    global _redis_client, _redis_pool

    if _redis_client is None:
        return None

    # Verify the connection is still alive; attempt one silent reconnect if not
    try:
        _redis_client.ping()
        return _redis_client
    except (redis.ConnectionError, redis.TimeoutError):
        print("[WARN]  Redis ping failed – attempting reconnect...")
        try:
            _redis_pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=10,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
            _redis_client = redis.Redis(connection_pool=_redis_pool)
            _redis_client.ping()
            print("[OK] Redis reconnected successfully")
            return _redis_client
        except Exception as reconnect_err:
            print(f"[WARN]  Redis reconnect failed: {reconnect_err} – running without cache")
            _redis_client = None
            _redis_pool = None
            return None
    except Exception as e:
        print(f"[WARN]  Redis unexpected error in get_redis: {e}")
        return None


def close_redis():
    """
    Close Redis connection and cleanup pool
    Call this on application shutdown
    """
    global _redis_pool, _redis_client
    
    if _redis_client:
        try:
            _redis_client.close()
            print("[OK] Redis connection closed")
        except Exception as e:
            print(f"[WARN]  Error closing Redis: {e}")
    
    if _redis_pool:
        try:
            _redis_pool.disconnect()
        except Exception as e:
            print(f"[WARN]  Error disconnecting Redis pool: {e}")
    
    _redis_pool = None
    _redis_client = None


def redis_health_check() -> dict:
    """
    Check Redis connection health
    
    Returns:
        dict with status and info
    """
    r = get_redis()
    
    if not r:
        return {
            "status": "disconnected",
            "message": "Redis client not initialized"
        }
    
    try:
        # Test connection
        r.ping()
        
        # Get Redis info
        info = r.info("server")
        
        return {
            "status": "connected",
            "redis_version": info.get("redis_version", "unknown"),
            "uptime_seconds": info.get("uptime_in_seconds", 0)
        }
        
    except redis.ConnectionError:
        return {
            "status": "error",
            "message": "Cannot connect to Redis server"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
