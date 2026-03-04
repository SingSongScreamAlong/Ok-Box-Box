#!/usr/bin/env python3
"""
Compress existing uncompressed race log files to save disk space.
Converts .jsonl files to .jsonl.gz format.
"""
import gzip
import shutil
from pathlib import Path
import os

LOG_DIR = Path(__file__).parent / "race_logs"

def compress_file(filepath: Path) -> tuple[int, int]:
    """Compress a single file. Returns (original_size, compressed_size)"""
    gz_path = filepath.with_suffix(filepath.suffix + '.gz')
    
    # Skip if already compressed version exists
    if gz_path.exists():
        return 0, 0
    
    original_size = filepath.stat().st_size
    
    # Compress
    with open(filepath, 'rb') as f_in:
        with gzip.open(gz_path, 'wb', compresslevel=6) as f_out:
            shutil.copyfileobj(f_in, f_out)
    
    compressed_size = gz_path.stat().st_size
    
    # Remove original after successful compression
    filepath.unlink()
    
    return original_size, compressed_size

def main():
    if not LOG_DIR.exists():
        print("No race_logs directory found")
        return
    
    total_original = 0
    total_compressed = 0
    files_processed = 0
    
    # Find all uncompressed jsonl files
    for session_dir in LOG_DIR.iterdir():
        if not session_dir.is_dir():
            continue
        
        print(f"\n📁 Processing {session_dir.name}...")
        
        for jsonl_file in session_dir.glob("*.jsonl"):
            # Skip if it's already a .gz file reference
            if jsonl_file.suffix == '.gz':
                continue
            
            print(f"   Compressing {jsonl_file.name}...", end=" ")
            
            try:
                orig, comp = compress_file(jsonl_file)
                if orig > 0:
                    ratio = (1 - comp/orig) * 100
                    print(f"{orig/1024/1024:.1f}MB → {comp/1024/1024:.1f}MB ({ratio:.0f}% reduction)")
                    total_original += orig
                    total_compressed += comp
                    files_processed += 1
                else:
                    print("already compressed")
            except Exception as e:
                print(f"ERROR: {e}")
    
    print(f"\n{'='*60}")
    print(f"COMPRESSION COMPLETE")
    print(f"{'='*60}")
    print(f"Files processed: {files_processed}")
    if total_original > 0:
        total_ratio = (1 - total_compressed/total_original) * 100
        print(f"Total original:   {total_original/1024/1024:.1f} MB")
        print(f"Total compressed: {total_compressed/1024/1024:.1f} MB")
        print(f"Space saved:      {(total_original-total_compressed)/1024/1024:.1f} MB ({total_ratio:.0f}%)")

if __name__ == "__main__":
    main()
