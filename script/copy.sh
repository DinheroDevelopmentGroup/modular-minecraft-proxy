#!/usr/bin/env bash

# add symlinks
find src -type d -name "node_modules" | while read -r dir_src; do
  dir=${dir_src#src/}
  dir_dist="dist/${dir}"

  mkdir -p "$(dirname "$dir_dist")"

  if [[ ! -L "$dir_dist" ]]; then
    rm -rf "$dir_dist"
    ln -sTrf "$dir_src" "$dir_dist"
  fi
done

# remove symlinks
find dist -type l -name "node_modules" | while read -r link_dist; do
  link=${link_dist#dist/}
  link_src="src/${link}"

  if [[ ! -d "$link_src" ]]; then
    rm "$link_dist"
  fi
done
