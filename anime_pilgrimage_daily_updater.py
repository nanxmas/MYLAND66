#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import time
import requests
import logging
import argparse
import sys
import datetime
from pathlib import Path
from anime_pilgrimage_scraper import AnimePilgrimageScraper, LOCK_FILE

# Lock file path for the monthly updater
MONTHLY_UPDATER_LOCK = "anitabi_updater.lock"
# Base directory for anime data
BASE_DIR = "pic/data"
# Bark notification URL
DEFAULT_BARK_URL = "https://api.day.app/FXxtHPEhbvdzxrgRpBW7E"

def setup_logging():
    """Set up logging configuration"""
    logger = logging.getLogger("AnimePilgrimageUpdater")
    logger.setLevel(logging.INFO)

    # Create handlers
    c_handler = logging.StreamHandler()
    f_handler = logging.FileHandler("anime_pilgrimage_daily.log")
    c_handler.setLevel(logging.INFO)
    f_handler.setLevel(logging.INFO)

    # Create formatters and add to handlers
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    c_handler.setFormatter(formatter)
    f_handler.setFormatter(formatter)

    # Add handlers to the logger
    logger.addHandler(c_handler)
    logger.addHandler(f_handler)

    return logger

def is_monthly_updater_running():
    """Check if the monthly updater is running by looking for its lock file"""
    return os.path.exists(MONTHLY_UPDATER_LOCK)

def is_daily_updater_running():
    """Check if the daily updater is running by looking for its lock file"""
    return os.path.exists(LOCK_FILE)

def create_lock_file():
    """Create a lock file to indicate that the updater is running"""
    try:
        with open(LOCK_FILE, 'w') as f:
            f.write(str(datetime.datetime.now()))
        return True
    except Exception as e:
        logging.error(f"Error creating lock file: {e}")
        return False

def remove_lock_file():
    """Remove the lock file"""
    try:
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
        return True
    except Exception as e:
        logging.error(f"Error removing lock file: {e}")
        return False

def send_bark_notification(bark_url, title, message):
    """Send notification via Bark"""
    full_url = f"{bark_url}/{title}/{message}"

    try:
        response = requests.get(full_url)
        response.raise_for_status()
        logging.info("Bark notification sent successfully")
        return True
    except Exception as e:
        logging.error(f"Failed to send Bark notification: {e}")
        return False

def run_daily_updater(args):
    """Run the daily anime pilgrimage updater"""
    logger = setup_logging()
    logger.info("Starting daily anime pilgrimage updater")

    # Check if another instance is running
    if is_daily_updater_running():
        logger.warning("Another instance of the daily updater is already running")
        return False

    # Check if monthly updater is running
    wait_attempts = 0
    while is_monthly_updater_running() and wait_attempts < args.max_wait_attempts:
        wait_attempts += 1
        logger.warning(f"Monthly updater is running. Waiting {args.wait_time/60} minutes (attempt {wait_attempts}/{args.max_wait_attempts})")
        time.sleep(args.wait_time)  # Wait for the specified time

        # If we've waited the maximum number of times, delay for 12 hours
        if wait_attempts == args.max_wait_attempts:
            logger.warning("Maximum wait attempts reached. Delaying for 12 hours.")
            time.sleep(43200)  # 12 hours in seconds

            # Check one more time
            if is_monthly_updater_running():
                logger.error("Monthly updater is still running after 12 hours. Exiting.")
                return False

    # Initialize the scraper first (don't create lock file yet)
    scraper = AnimePilgrimageScraper(
        base_dir=args.base_dir,
        headless=True,
        auto_mode=True
    )

    # Now create the lock file
    if not create_lock_file():
        logger.error("Failed to create lock file. Exiting.")
        return False

    try:

        success = scraper.run(
            auto_mode=True,
            max_anime=args.max_anime,
            wait_time=args.wait_time,
            max_wait_attempts=args.max_wait_attempts
        )

        if success:
            # Send notification
            title = "🔄 动漫巡礼每日更新"
            message = f"✅ 每日更新成功！已检查最近更新的动漫，添加新番剧并更新已有番剧的巡礼点数据。"
            send_bark_notification(args.bark_url, title, message)
            logger.info("Daily update completed successfully")
        else:
            # Send notification about failure
            title = "⚠️ 动漫巡礼每日更新失败"
            message = "❌ 更新动漫巡礼数据失败。请查看日志了解详情。"
            send_bark_notification(args.bark_url, title, message)
            logger.error("Daily update failed")

        return success

    except Exception as e:
        logger.error(f"Error running daily updater: {e}")
        # Send notification about error
        title = "🚨 动漫巡礼每日更新错误"
        message = f"⛔ 每日更新过程中出现错误: {str(e)[:100]}..."
        send_bark_notification(args.bark_url, title, message)
        return False

    finally:
        # Always remove the lock file when done
        remove_lock_file()

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Anime Pilgrimage Daily Updater')
    parser.add_argument('--max-anime', type=int, default=50, help='Maximum number of anime to check for updates')
    parser.add_argument('--wait-time', type=int, default=1800, help='Time to wait in seconds if another process is running (default: 30 minutes)')
    parser.add_argument('--max-wait-attempts', type=int, default=3, help='Maximum number of times to wait before giving up')
    parser.add_argument('--base-dir', type=str, default=BASE_DIR, help='Base directory for anime data')
    parser.add_argument('--bark-url', type=str, default=DEFAULT_BARK_URL, help='Bark notification URL')

    args = parser.parse_args()

    # Run the updater
    success = run_daily_updater(args)

    # Return appropriate exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
