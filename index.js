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
const commentsData = '/media/comments.csv'
// Development
//const commentsData = './comments.csv'

const puppeteer = require('puppeteer')
const Instauto = require('prawira_instauto')

const fs = require('fs')
const csv = require('csv-parser')

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
      likedPhotosDbPath: './liked-photos.json'
    })

    const instauto = await Instauto(instautoDB, browser, option)

    const unfollowedCount = await instauto.unfollowOldFollowed({
      ageInDays: config.ageInDays,
      limit: option.maxFollowsPerDay * (2 / 3)
    })

    if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000)

    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: option.maxFollowsPerDay - unfollowedCount,
      skipPrivate: config.skipPrivate,
      enableLikeImages: config.enableLikeImages,
      likeImagesMax: config.likeImagesMax,
      enableCommentContents: config.enableCommentContents,
      comments: comments
    })

    await instauto.sleep(10 * 60 * 1000)

    console.log('Done running')

    await instauto.sleep(30000)

  } catch (err) {
    console.log(err)
  } finally {
    console.log('Closing Browser')
    if (browser) await browser.close()
  }
})()
