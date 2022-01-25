#!/bin/bash
configFilePath="/media/config.json"
userMustFollowPath="/media/userMustFollow.csv"
commentsFilePath="/media/comments.csv"

[ ! -f "${configFilePath}" ] && cp "./config.json" "${configFilePath}"

[ ! -f $userMustFollowPath ] && echo "username" >> userMustFollow.csv

[ ! -f $commentsFilePath ] && echo "comments" >> comments.csv

yarn start
