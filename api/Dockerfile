FROM python:3.12.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /api

COPY requirements.txt .
#install the uv python package manager
RUN pip install uv
# --system to avoid uv asking for a venv, we don't need it, imgs give enough isolation
RUN uv pip install --no-cache-dir --system -r requirements.txt

COPY . .

ENTRYPOINT ["uvicorn", "main:app"]
CMD ["--host", "0.0.0.0", "--port", "5000"]
