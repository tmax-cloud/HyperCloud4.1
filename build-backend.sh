#!/usr/bin/env bash

set -e

# Builds the server-side golang resources for tectonic-console. For a
# complete build, you must also run build-frontend

PROJECT_DIR=$(basename ${PWD})

# GIT_TAG=`git describe --always --tags HEAD`
GIT_TAG=$(git describe --tags $(git rev-list --tags --max-count=1))
LD_FLAGS="-w -X github.com/openshift/console/version.Version=${GIT_TAG}"

# CGO_ENABLED=0 go build -ldflags "${LD_FLAGS}" -o bin/bridge github.com/openshift/console/cmd/bridge
go build -ldflags "${LD_FLAGS}" -o bin/bridge github.com/openshift/console/cmd/bridge
