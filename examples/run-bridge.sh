#!/bin/bash -e

export OPENSHIFT_API=https://192.168.8.54:8443

./bin/bridge \
    --base-address=http://192.168.8.61:9000 \
    --ca-file=examples/ca.crt \
    --k8s-auth=openshift \
    --k8s-mode=off-cluster \
    --k8s-mode-off-cluster-endpoint=$OPENSHIFT_API \
    --k8s-mode-off-cluster-skip-verify-tls=true \
    --listen=http://192.168.8.61:9000 \
    --public-dir=./frontend/public/dist \
    --user-auth=openshift \
    --user-auth-oidc-client-id=console-oauth-client-gyoungjun \
    --user-auth-oidc-client-secret-file=examples/console-client-secret \
    --user-auth-oidc-ca-file=examples/ca.crt
