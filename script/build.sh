#!/usr/bin/env bash

# --delete-dir-on-start breaks nodemon
swc \
  src --strip-leading-paths -d dist \
  $@
