---
name: python-uv
description: Python tooling with uv - use uv for all Python operations (tests, scripts, formatters, etc.)
---

# Python Tooling with UV

**Rule:** For ALL Python-related operations in this workspace, use `uv` as the primary tool.

## Core Principles

1. **Always use uv run** for executing Python scripts and commands
2. **Use uv for dependency management** instead of pip
3. **Use uv for virtual environment management** instead of venv/virtualenv
4. **Prefix all Python tools with uv run** (pytest, black, ruff, mypy, etc.)

## Common Commands

### Running Tests
```bash
# DO THIS
uv run pytest
uv run pytest tests/
uv run pytest -v tests/test_specific.py

# NOT THIS
pytest
python -m pytest
```

### Running Scripts
```bash
# DO THIS
uv run python script.py
uv run python -m module.script

# NOT THIS
python script.py
```

### Code Formatting
```bash
# DO THIS
uv run black .
uv run ruff check .
uv run ruff format .

# NOT THIS
black .
ruff check .
```

### Type Checking
```bash
# DO THIS
uv run mypy src/

# NOT THIS
mypy src/
```

### Linting
```bash
# DO THIS
uv run flake8 src/
uv run pylint src/

# NOT THIS
flake8 src/
pylint src/
```

### Running Applications
```bash
# DO THIS
uv run python -m app.main
uv run uvicorn app.main:app

# NOT THIS
python -m app.main
uvicorn app.main:app
```

### Dependency Management
```bash
# DO THIS
uv add package-name
uv add --dev pytest
uv sync
uv lock

# NOT THIS
pip install package-name
pip install -r requirements.txt
```

### Environment Management
```bash
# DO THIS
uv venv
uv sync

# NOT THIS
python -m venv venv
source venv/bin/activate
```

## Why UV?

- **Faster:** 10-100x faster than pip
- **Reliable:** Lockfile-based dependency resolution
- **Consistent:** Same dependencies across all environments
- **Simple:** Single tool for all Python operations
- **Modern:** Built-in support for pyproject.toml

## Verification Checklist

Before running any Python command, ask:
- [ ] Am I prefixing with `uv run`?
- [ ] Am I using `uv add` instead of `pip install`?
- [ ] Am I using `uv sync` instead of `pip install -r`?
- [ ] Am I using uv for ALL Python tooling (formatters, linters, etc.)?

## Exception

Only use raw `python` or tool commands if explicitly instructed to bypass uv for a specific reason.
