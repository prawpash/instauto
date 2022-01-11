'use strict'

const puppeteer = require('puppeteer')
const Instauto = require('instauto')

const fs = require('fs')
const csv = require('csv-parser')

const option = {
  cookiesPath: './cookies.json',
  username: `${process.env.USERNAMEIG}`,
  password: `${process.env.PASSWORDIG}`,
  maxFollowsPerHour: 15,
  maxFollowsPerDay: 100,
  maxLikesPerDay: 50,
  followUserRatioMin: 0.2,
  followUserRatioMax: 4.0,
  followUserMaxFollowers: null,
  followUserMaxFollowing: null,
  followUserMinFollowers: null,
  followUserMinFollowing: null,
  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,
  excludeUsers: [],
  dryRun: true
}

;(async () => {
  try{
    const usersToFollowFollowersOf = []

    const readStream = fs.createReadStream('userMustFollow.csv')
      .pipe(csv())
      .on('data', (row) => {
        usersToFollowFollowersOf.push(row.username)
      })
      .on('end', () => {
        console.log('CSV End')
      })

    for await (const chunk of readStream){
      console.log(`>>> ${chunk}`)
    }

    let browser = await puppeteer.launch({ headless:false })

    const instautoDB = await Instauto.JSONDB({
      followedDbPath: './followed.json',
      unfollowedDbPath: './unfollowed.json',
      likedPhotosDbPath: './liked-photos.json'
    })

    const instauto = await Instauto(instautoDB, browser, option)

    const unfollowedCount = await instauto.unfollowOldFollowed({ ageInDays: 14, limit: option.maxFollowsPerDay * (2 / 3) })

    if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000)

    await instauto.followUsersFollowers({
      usersToFollowFollowersOf,
      maxFollowsTotal: option.maxFollowsPerDay - unfollowedCount,
      skipPrivate: true,
      enableLikeImages: true,
      likeImagesMax: 2
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
