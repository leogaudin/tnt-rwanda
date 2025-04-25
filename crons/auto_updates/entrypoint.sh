# © GAUDIN
# This script is run automatically at 23:59 each day.
# The rest of the info is given by each comment below.

# Fetch latest changes
cd /tnt-rwanda
git restore .
git pull

cd ./server
npm i

cd ../

# Re-build the frontend
cd ./client
npm i
npm run build
