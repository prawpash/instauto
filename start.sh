#!/bin/bash
configFilePath="/media/config.json"
userMustFollowPath="/media/userMustFollow.csv"
commentsFilePath="/media/comments.csv"
userNeedToFollows="/media/userNeedToFollows.csv"
nextSchedule="/media/nextSchedule.json"
scheduleData="/media/scheduleData.csv"

[ ! -f "${configFilePath}" ] && cp "./config.json" "${configFilePath}"

[ ! -f $userMustFollowPath ] && echo "username" >> $userMustFollowPath

[ ! -f $commentsFilePath ] && echo "comments" >> $commentsFilePath

[ ! -f $userNeedToFollows ] && echo "username" >> $userNeedToFollows

[ ! -f $nextSchedule ] && echo "" >> $nextSchedule

[ ! -f $scheduleData ] && echo "time,path,ratio,caption" >> $scheduleData

yarn start
