import logging

import structlog


def configure_logging() -> None:
    """Configure structlog to emit one JSON object per log line to stdout.

    `merge_contextvars` pulls in any context-local values bound during a
    request (e.g. correlation_id) so every log line inside that request
    carries it automatically.
    """
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
