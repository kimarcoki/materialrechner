FROM node:22-bookworm-slim

# better-sqlite3 needs build tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json /app/
RUN npm install --omit=dev

COPY . /app/

RUN mkdir -p /app/data

ENV PORT=8080
ENV DB_PATH=/app/data/app.db

EXPOSE 8080
CMD ["npm","start"]
