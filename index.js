'use strict'

// Production
const config = require('/media/config.json')
// Development
//const config = require('./config.json')

// Production
const userMustFollow = '/media/userMustFollow.csv'
// Development
//const userMustFollow = './userMustFollow.csv'

// Production
const userNeedToFollowsPath = '/media/userNeedToFollows.csv'
// Development
//const userNeedToFollowsPath = './userNeedToFollows.csv'

// Production
const commentsData = '/media/comments.csv'
// Development
//const commentsData = './comments.csv'

// Production
const nextSchedulePath = '/media/nextSchedule.json'
// Development
//const nextSchedulePath = './nextSchedule.json'

// Production
const scheduleDataPath = '/media/scheduleData.csv'
// Development
//const scheduleDataPath = './scheduleData.csv'


const puppeteer = require('puppeteer')
const Instauto = require('prawira_instauto')

const fs = require('fs')
const csv = require('csv-parser')

const setIntervalAsync = (fn, ms) => {
  fn().then((resp) => {
    if(resp == "stop"){
      return
    } else {
      setTimeout(() => setIntervalAsync(fn, ms), ms)
    }
  })
}

var isScheduleDone = false
var isCommonDone = false

let scheduleData = []

const option = {
  cookiesPath: './cookies.json',
  username: `${process.env.USERNAMEIG}`,
  password: `${process.env.PASSWORDIG}`,
  maxFollowsPerHour: config.maxFollowsPerHour,
  maxFollowsPerDay: config.maxFollowsPerDay,
  maxLikesPerDay: config.maxLikesPerDay,
  followUserRatioMin: config.followUserRatioMin,
  followUserRatioMax: config.followUserRatioMax,
  followUserMaxFollowers: config.followUserMaxFollowers,
  followUserMaxFollowing: config.followUserMaxFollowing,
  followUserMinFollowers: config.followUserMinFollowers,
  followUserMinFollowing: config.followUserMinFollowing,
  dontUnfollowUntilTimeElapsed: config.dontUnfollowUntilTimeElapsed,
  excludeUsers: config.excludeUsers,
  dryRun: false
}

;(async () => {
  try{
    const usersToFollowFollowersOf = []
    const comments = []
    const userNeedToFollows = []

    const readStream = fs.createReadStream(userMustFollow)
      .pipe(csv())
      .on('data', (row) => {
        usersToFollowFollowersOf.push(row.username)
      })
      .on('end', () => {
        console.log("Get Data User From CSV Complete")
      })

    for await (const chunk of readStream){
      console.log(`>>> ${chunk}`)
    }

    const commentReadStream = fs.createReadStream(commentsData)
      .pipe(csv())
      .on('data', (row) => {
        comments.push(row.comments)
      })
      .on('end', () => {
        console.log("Get Data Comment From CSV Complete")
      })

    for await (const chunk of commentReadStream){
      console.log(`>>> ${chunk}`)
    }

    const scheduleReadStream = fs.createReadStream(scheduleDataPath)
      .pipe(csv())
      .on('data', (row) => {
        scheduleData.push({
          "schedule_name": "Post Content",
          "time": `${row.time}`,
          "content_media": [
            {
              //"content_path": `${row.path}`,
              "content_path": `/media/${row.path}`,
              "content_ratio": `${row.ratio}`
            }
          ],
          "content_caption": `${row.caption}`,
          "isPosted": 0
        })
      })
      .on('end', () => {
        console.log("Get Data Schedule Done")
      })

    for await (const chunk of scheduleReadStream) {
      console.log(`>>> ${chunk}`)
    }

    scheduleData = scheduleData.map((ele, index) => {
      return {
        "id": index + 1,
        ...ele
      }
    })

    if (config.followUsersDirectlyFromCSV) {
      const userReadStream = fs.createReadStream(userNeedToFollowsPath)
        .pipe(csv())
        .on('data', (row) => {
          console.log(row)
          userNeedToFollows.push(row.username)
        })
        .on('end', () => {
          console.log("Get Data User From CSV Complete")
        })

      for await (const chunk of userReadStream) {
        console.log(`>>> ${chunk}`)
      }
    }

    var browser = await puppeteer.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-sandbox"
      ]
    })

    const instautoDB = await Instauto.JSONDB({
      followedDbPath: './followed.json',
      unfollowedDbPath: './unfollowed.json',
      likedPhotosDbPath: './liked-photos.json',
      taskScheduleDbPath: nextSchedulePath
    })

    const instauto = await Instauto(instautoDB, browser, option)

    if(scheduleData.length > 0) {
      setIntervalAsync(async () => {
        let check = await instauto.checkSchedule(scheduleData)
        console.log("Data", check)

        scheduleData = scheduleData.map(data => {
          if(data.id == check?.id) {
            return {
              ...data,
              isPosted: check.isPosted
            }
          }

          return data
        })

        if (check === false) {
          console.log("No Schedule Found")
          isScheduleDone = true
          if (isCommonDone) await browser.close()
          return "stop"
        }
      }, 1000 * 60)
    }

    const unfollowedCount = await instauto.unfollowOldFollowed({
      ageInDays: config.ageInDays,
      limit: option.maxFollowsPerDay * (2 / 3)
    })

    if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000)

    if (config.followUsersDirectlyFromCSV) {
      await instauto.followUsersFromCSV(userNeedToFollows, {
        skipPrivate: config.skipPrivate,
        enableLikeImages: config.enableLikeImages,
        likeImagesMax: config.likeImagesMax,
        enableCommentContents: config.enableCommentContents,
        comments: comments
      })
    } else {
      await instauto.followUsersFollowers({
        usersToFollowFollowersOf,
        maxFollowsTotal: option.maxFollowsPerDay - unfollowedCount,
        skipPrivate: config.skipPrivate,
        enableLikeImages: config.enableLikeImages,
        likeImagesMax: config.likeImagesMax,
        enableCommentContents: config.enableCommentContents,
        comments: comments
      })
    }

    await instauto.sleep(10 * 60 * 1000)

    console.log('Done running')

    await instauto.sleep(30000)

  } catch (err) {
    console.log(err)
  } finally {
    isCommonDone = true
    console.log('Closing Browser')
    if (browser && isScheduleDone) await browser.close()
  }
})()
