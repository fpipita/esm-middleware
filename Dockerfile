FROM node:13.13.0-buster
RUN apt-get update \
  && apt-get install -y bash-completion vim less \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
