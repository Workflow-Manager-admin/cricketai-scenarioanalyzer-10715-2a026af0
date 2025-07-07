#!/bin/bash
cd /home/kavia/workspace/code-generation/cricketai-scenarioanalyzer-10715-2a026af0/react_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

