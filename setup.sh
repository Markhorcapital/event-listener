#!/bin/bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm use 18.18.0

cd /home/ubuntu/FriendTechEventListener/

sudo chown -R ubuntu:ubuntu /home/ubuntu/FriendTechEventListener/

echo " ============= REMOVING EXISTING PACKAGES ============= "
rm -rf /home/ubuntu/FriendTechEventListener/node_modules
rm -rf /home/ubuntu/FriendTechEventListener/yarn.lock

echo " ============= INSTALL PACKAGES ============= "
npm install

echo " ============= STOPPING SERVICE ============= "
pm2 stop 0
pm2 delete all

echo " ============= BUILD AND START FRONTEND APPLICATION ============= "
pm2 start index.js

echo " ============= DEPLOYMENT SUCCESSFUL ============= "
