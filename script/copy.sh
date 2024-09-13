#!/usr/bin/env bash

# hopefully excluding all ts files
# instead of including all node_modules
# doesn't come to bite me in the ass
# later
rsync \
  --verbose \
  -a --del src/ dist \
  --exclude "*.ts" \
  $@
