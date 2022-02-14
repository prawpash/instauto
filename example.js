'use strict';

const puppeteer = require('puppeteer'); // eslint-disable-line import/no-extraneous-dependencies

const Instauto = require('./index'); // eslint-disable-line import/no-unresolved

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

let data = [
  {
    "id": 1,
    "schedule_name": "Post Image",
    "time": "13:35",
    "content_media": [
      {
        "content_path": "./coba1.png",
        "content_ratio": 1
      }
    ],
    "content_caption": "Coba post gambar dengan ratio 1:1 @_af.th_ @prawira9 postingan ini diposting pada jam 11.11",
    "isPosted": 0
  },
  {
    "id": 2,
    "schedule_name": "Post Image 2",
    "time": "13:45",
    "content_media": [
      {
        "content_path": "./coba2.png",
        "content_ratio": 2
      }
    ],
    "content_caption": "Coba post gambar dengan ratio 4:5 @_af.th_ @prawira9, postingan ini diposting pada jam 10.45",
    "isPosted": 0
  },
  {
    "id": 3,
    "schedule_name": "Post Image 3",
    "time": "14:00",
    "content_media": [
      {
        "content_path": "./coba2.png",
        "content_ratio": 3
      }
    ],
    "content_caption": "Coba post gambar dengan ratio 16:9 @_af.th_ @prawira9, postingan ini diposting pada jam 10.35",
    "isPosted": 0
  }
]

const options = {
  cookiesPath: './cookies.json',


  // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one hour:
  maxFollowsPerHour: 5,
  // Global limit that prevents follow or unfollows (total) to exceed this number over a sliding window of one day:
  maxFollowsPerDay: 10,
  // (NOTE setting the above parameters too high will cause temp ban/throttle)

  maxLikesPerDay: 1,

  // Don't follow users that have a followers / following ratio less than this:
  followUserRatioMin: 0.2,
  // Don't follow users that have a followers / following ratio higher than this:
  followUserRatioMax: 4.0,
  // Don't follow users who have more followers than this:
  followUserMaxFollowers: 500,
  // Don't follow users who have more people following them than this:
  followUserMaxFollowing: null,
  // Don't follow users who have less followers than this:
  followUserMinFollowers: null,
  // Don't follow users who have more people following them than this:
  followUserMinFollowing: null,

  // NOTE: The dontUnfollowUntilTimeElapsed option is ONLY for the unfollowNonMutualFollowers function
  // This specifies the time during which the bot should not touch users that it has previously followed (in milliseconds)
  // After this time has passed, it will be able to unfollow them again.
  // TODO should remove this option from here
  dontUnfollowUntilTimeElapsed: 3 * 24 * 60 * 60 * 1000,

  // Usernames that we should not touch, e.g. your friends and actual followings
  excludeUsers: [],

  // If true, will not do any actions (defaults to true)
  dryRun: false,
};

(async () => {
  let browser;

  try {
    browser = await puppeteer.launch({ headless: false });

    // Create a database where state will be loaded/saved to
    const instautoDb = await Instauto.JSONDB({
      // Will store a list of all users that have been followed before, to prevent future re-following.
      followedDbPath: './followed.json',
      // Will store all unfollowed users here
      unfollowedDbPath: './unfollowed.json',
      // Will store all likes here
      likedPhotosDbPath: './liked-photos.json',
      // Will store next task here
      taskScheduleDbPath: './nextSchedule.json'
    });

    const instauto = await Instauto(instautoDb, browser, options);

    // This can be used to unfollow people:
    // Will unfollow auto-followed AND manually followed accounts who are not following us back, after some time has passed
    // The time is specified by config option dontUnfollowUntilTimeElapsed
    //await instauto.unfollowNonMutualFollowers();
    //await instauto.sleep(10 * 60 * 1000);

    // Unfollow previously auto-followed users (regardless of whether or not they are following us back)
    // after a certain amount of days (2 weeks)
    // Leave room to do following after this too (unfollow 2/3 of maxFollowsPerDay)
    //const unfollowedCount = await instauto.unfollowOldFollowed({ ageInDays: 14, limit: options.maxFollowsPerDay * (2 / 3) });

    //if (unfollowedCount > 0) await instauto.sleep(10 * 60 * 1000);

    // List of usernames that we should follow the followers of, can be celebrities etc.
    //const usersToFollowFollowersOf = ['mubitive', 'sekolahkoding'];

    // Now go through each of these and follow a certain amount of their followers
    //await instauto.followUsersFollowers({
    //  usersToFollowFollowersOf,
    //  maxFollowsTotal: options.maxFollowsPerDay - unfollowedCount,
    //  skipPrivate: true,
    //  enableLikeImages: true,
    //  likeImagesMax: 3,
    //  enableCommentContents: true
    //});

    //await instauto.followUsersFromCSV(["dicoding"], {
    //  maxFollowsTotal: options.maxFollowsPerDay - 2,
    //  skipPrivate: true,
    //  enableLikeImages: false,
    //  likeImagesMax: 3,
    //  enableCommentContents: true
    //})

    let checkSchedule = setIntervalAsync(async () => {
      let check = await instauto.checkSchedule(data)
      console.log("Dari Depan")

      console.log(check)

      data = data.map(item => {
        if (item.id == check?.id) {
          return {
            ...item,
            isPosted: check.isPosted
          }
        }

        return item
      })

      if(check === false) {
        isScheduleDone = true
        if (isCommonDone) await browser.close()
        return "stop"
      }
    }, 1000 * 60);
    //await instauto.postContent(data[0].content_media[0].content_path, data[0].content_media[0].content_ratio, data[0].content_caption)
    await instauto.sleep(10 * 60 * 1000);
    //await instauto.experimental();

    console.log('Done running');

    //await instauto.sleep(30000);
  } catch (err) {
    console.error(err);
  } finally {
    isCommonDone = true
    console.log('Closing browser');
    if (browser && isScheduleDone) await browser.close();
  }
})();
