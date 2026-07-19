import sys
from loguru import logger
from app.core.config import settings


def setup_logging():
    logger.remove()  # Remove default handler

    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # Console handler
    logger.add(
        sys.stdout,
        format=log_format,
        level="DEBUG" if settings.DEBUG else "INFO",
        colorize=True,
    )

    # File handler
    logger.add(
        "logs/app.log",
        format=log_format,
        level="INFO",
        rotation="10 MB",
        retention="30 days",
        compression="zip",
    )

    return logger
