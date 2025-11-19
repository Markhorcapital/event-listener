#!/bin/bash
ENV_FILE=${1:-".env.ethereum"}  # default to ethereum if no arg
node --env-file=.env.common --env-file=$ENV_FILE index.js