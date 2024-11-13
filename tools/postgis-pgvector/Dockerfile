FROM postgis/postgis:16-3.5

RUN apt-get update \
  && apt-mark hold locales\
  && apt-get install -y --no-install-recommends git build-essential postgresql-server-dev-16 \
  && git clone --depth=1 --branch v0.7.3 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && cd /tmp/pgvector \
  && make clean && make OPTFLAGS="" && make install \
  && cd / \
  && rm -r /tmp/pgvector \
  && apt-get remove -y git build-essential postgresql-server-dev-16 \
  && apt-get autoremove -y \
	&& apt-mark unhold locales \
	&& rm -rf /var/lib/apt/lists/*

COPY 20_pgvector.sql /docker-entrypoint-initdb.d/20_pgvector.sql
