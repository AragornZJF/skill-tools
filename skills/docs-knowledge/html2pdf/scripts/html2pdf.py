#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML to PDF 转换工具
使用系统浏览器 headless 模式打印 PDF
支持 Windows / macOS / Linux
"""

import subprocess
import sys
import os
import time
from pathlib import Path
from urllib.parse import urlparse

def find_browser():
    """查找系统浏览器，返回 (路径, 名称) 或 (None, None)"""
    browsers = []
    
    if sys.platform == 'win32':
        browsers = [
            (r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', 'Edge'),
            (r'C:\Program Files\Microsoft\Edge\Application\msedge.exe', 'Edge'),
            (r'C:\Program Files\Google\Chrome\Application\chrome.exe', 'Chrome'),
            (r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe', 'Chrome'),
        ]
    elif sys.platform == 'darwin':
        browsers = [
            ('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'Edge'),
            ('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'Chrome'),
        ]
    else:  # Linux
        for cmd in ['chromium-browser', 'chromium', 'google-chrome', 'chrome']:
            try:
                path = subprocess.check_output(['which', cmd], text=True).strip()
                if path:
                    browsers.append((path, cmd))
                    break
            except Exception:
                pass
    
    for path, name in browsers:
        if os.path.exists(path):
            return path, name
    
    return None, None

def html_to_pdf(html_path, pdf_path):
    """将 HTML 文件或网页 URL 转换为 PDF"""
    browser_path, browser_name = find_browser()
    
    if not browser_path:
        print("[X] 未找到浏览器（Edge/Chrome）")
        print("   请手动在浏览器中打开 HTML，按 Ctrl+P 打印为 PDF")
        return False
    
    print(f"[*] 使用浏览器: {browser_name}")
    
    # 构造 URL：支持 http(s) 链接和本地文件
    parsed = urlparse(html_path)
    if parsed.scheme in ('http', 'https'):
        url = html_path
    else:
        abs_html = os.path.abspath(html_path)
        url = Path(abs_html).as_uri()
    
    # 执行命令
    cmd = [
        browser_path,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--print-to-pdf-no-header',
        f'--print-to-pdf={pdf_path}',
        url
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            print(f"[X] 浏览器进程退出码: {result.returncode}")
            if result.stderr:
                print(f"    stderr: {result.stderr[:500]}")
            return False
        
        # Edge 可能异步写入文件，等待最多 5 秒
        pdf_ready = False
        for _ in range(10):  # 最多等 5 秒（每次 0.5 秒）
            if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 1000:
                pdf_ready = True
                break
            time.sleep(0.5)
        
        if pdf_ready:
            size_kb = os.path.getsize(pdf_path) / 1024
            print(f"[OK] PDF 生成成功: {pdf_path} ({size_kb:.1f} KB)")
            return True
        else:
            print("[X] PDF 生成失败: 文件未生成或大小异常")
            if result.stderr:
                print(f"    stderr: {result.stderr[:500]}")
            return False
    except subprocess.TimeoutExpired:
        print("[X] 超时（60秒）")
        return False
    except Exception as e:
        print(f"[X] 异常: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("用法: python html2pdf.py <输入HTML或URL> <输出PDF>")
        sys.exit(1)
    
    html_path = sys.argv[1]
    pdf_path = sys.argv[2]
    
    # 输入为本地文件时校验存在性（URL 跳过）
    parsed = urlparse(html_path)
    if parsed.scheme not in ('http', 'https') and not os.path.exists(html_path):
        print(f"[X] 文件不存在: {html_path}")
        sys.exit(1)
    
    # 确保输出目录存在
    out_dir = os.path.dirname(os.path.abspath(pdf_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    
    print(f"输入: {html_path}")
    print(f"输出: {pdf_path}")
    print("-" * 50)
    
    if html_to_pdf(html_path, pdf_path):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
