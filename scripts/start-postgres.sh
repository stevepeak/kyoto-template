#!/bin/bash
set -e

# Configuration
POSTGRES_VERSION="16.9.0"
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_DB=kyoto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
POSTGRES_DATA_DIR="$PROJECT_ROOT/.postgres-data"
POSTGRES_INSTALL_DIR="$PROJECT_ROOT/.postgres"

# Detect platform
detect_platform() {
  local os=$(uname -s | tr '[:upper:]' '[:lower:]')
  local arch=$(uname -m)

  case "$os" in
    darwin)
      case "$arch" in
        x86_64) echo "macos-x64" ;;
        arm64) echo "macos-arm64" ;;
        *) echo "unsupported"; exit 1 ;;
      esac
      ;;
    linux)
      case "$arch" in
        x86_64) echo "linux-x64" ;;
        *) echo "unsupported"; exit 1 ;;
      esac
      ;;
    *) echo "unsupported"; exit 1 ;;
  esac
}

# Download and extract PostgreSQL if not already installed
install_postgres() {
  if [ -d "$POSTGRES_INSTALL_DIR/bin" ]; then
    echo "PostgreSQL already installed at $POSTGRES_INSTALL_DIR"
    return 0
  fi

  local platform=$(detect_platform)
  local url=""

  case "$platform" in
    macos-x64) url="https://github.com/theseus-rs/postgresql-binaries/releases/download/${POSTGRES_VERSION}/postgresql-${POSTGRES_VERSION}-x86_64-apple-darwin.tar.gz" ;;
    macos-arm64) url="https://github.com/theseus-rs/postgresql-binaries/releases/download/${POSTGRES_VERSION}/postgresql-${POSTGRES_VERSION}-aarch64-apple-darwin.tar.gz" ;;
    linux-x64) url="https://github.com/theseus-rs/postgresql-binaries/releases/download/${POSTGRES_VERSION}/postgresql-${POSTGRES_VERSION}-x86_64-unknown-linux-gnu.tar.gz" ;;
  esac

  echo "Downloading PostgreSQL ${POSTGRES_VERSION} for ${platform}..."
  mkdir -p "$POSTGRES_INSTALL_DIR"

  curl -fsSL "$url" | tar -xz -C "$POSTGRES_INSTALL_DIR" --strip-components=1

  echo "PostgreSQL installed successfully"
}

# Set library paths
export DYLD_LIBRARY_PATH="$POSTGRES_INSTALL_DIR/lib"
export LD_LIBRARY_PATH="$POSTGRES_INSTALL_DIR/lib"
export PATH="$POSTGRES_INSTALL_DIR/bin:$PATH"

# Install PostgreSQL if needed
install_postgres

# Initialize data directory if it doesn't exist
if [ ! -d "$POSTGRES_DATA_DIR" ]; then
  echo "Initializing PostgreSQL data directory..."
  initdb -D "$POSTGRES_DATA_DIR" -U $POSTGRES_USER
fi

echo -e "\033[32mStopping any existing PostgreSQL server\033[0m"
pg_ctl stop -D "$POSTGRES_DATA_DIR" -m fast 2>/dev/null || true

# Start PostgreSQL server in foreground
echo -e "Access with:\033[36m psql -h localhost -p $POSTGRES_PORT -U $POSTGRES_USER \033[0m"
echo -e "Connection URI:\033[36m postgresql://$POSTGRES_USER:$POSTGRES_USER@localhost:$POSTGRES_PORT/$POSTGRES_DB \033[0m"

# Trap to handle cleanup
trap 'printf "Shutting down PostgreSQL...\n"; \
  if [ -n "$PG_PID" ] 2>/dev/null && kill -0 "$PG_PID" 2>/dev/null; then \
    kill "$PG_PID" >/dev/null 2>&1 || true; \
  fi; \
  pg_ctl stop -D "$POSTGRES_DATA_DIR" -m fast >/dev/null 2>&1 || true' EXIT INT TERM

postgres -D "$POSTGRES_DATA_DIR" -p $POSTGRES_PORT -h 127.0.0.1 &
PG_PID=$!

# Wait for database to be ready
echo "Waiting for PostgreSQL to start..."
TIMEOUT=30
ELAPSED=0
until pg_isready -h 127.0.0.1 -p $POSTGRES_PORT -U $POSTGRES_USER >/dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "PostgreSQL failed to start within $TIMEOUT seconds"
    exit 1
  fi
  sleep 0.5
  ELAPSED=$((ELAPSED + 1))
done
echo "PostgreSQL is ready!"

# Create initial database if it doesn't exist
if createdb -h 127.0.0.1 -p $POSTGRES_PORT -U $POSTGRES_USER $POSTGRES_DB 2>/dev/null; then
  printf "\n\033[32m✅ Initial database createdx\033[0m\n"
elif psql -h 127.0.0.1 -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;" >/dev/null 2>&1; then
  printf "\n\033[33mℹ️  Database already exists\033[0m\n"
else
  printf "\033[31mFailed to create or connect to database\033[0m\n"
  if [ -n "$PG_PID" ] 2>/dev/null; then
    kill "$PG_PID" >/dev/null 2>&1 || true
  fi
  exit 1
fi

# Run migrations and propagate non-zero exit on failure
if bun --cwd="$PROJECT_ROOT/packages/db" run db:migrate 2>/dev/null || true; then
  printf "\n\033[32m✅ Database migrations completed!\033[0m\n"
else
  printf "\033[33m⚠️  Migration step skipped or failed (continuing anyway)\033[0m\n"
fi

# Wait for background process
wait $PG_PID
