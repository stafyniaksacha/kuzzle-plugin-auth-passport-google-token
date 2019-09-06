/* eslint-disable require-jsdoc */
const Strategy = require('passport-strategy').Strategy
const axios = require('axios');


class GoogleTokenStrategy extends Strategy {
  constructor(options, verify) {
    super(options, verify)

    if (!Object.prototype.hasOwnProperty.call(options, 'audiance')
      || !options.audiance
      || !Array.isArray(options.audiance)
    ) {
      throw new Error('GoogleTokenStrategy: missing audiance (array)')
    }

    this.name = 'google-token'
    this._verify = verify
    this._audiance = options.audiance
    // this._profileFields = options.profileFields.toString()
  }

  authenticate (request, options) {
    if (!Object.prototype.hasOwnProperty.call(request, 'body')
      || !Object.prototype.hasOwnProperty.call(request.body, 'access_token')
    ) {
      this.fail(new Error("Must provide an access_token"))
      return
    }


    // check user access_token from google api
    axios.request({
      url: 'https://www.googleapis.com/oauth2/v3/tokeninfo',
      method: 'post',
      data: `access_token=${request.body.access_token}`,
      headers: {
        'Cache-Control': 'no-cache',
        'Host': 'www.googleapis.com',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
      .then(tokenInfoResponse => {
        if (!Object.prototype.hasOwnProperty.call(tokenInfoResponse, 'status')
          || tokenInfoResponse.status !== 200
        ) {
          this.fail(new Error('Unable to get response from google api'))

          return;
        }

        if (!Object.prototype.hasOwnProperty.call(tokenInfoResponse, 'data')
          || !tokenInfoResponse.data
        ) {
          this.fail(new Error('Unable to get response from google api'))

          return;
        }

        // ensure access_token is for our audiance
        if (!Object.prototype.hasOwnProperty.call(tokenInfoResponse.data, 'aud')
          || !this._audiance.includes(tokenInfoResponse.data.aud)
        ) {
          this.fail(new Error('access_token does not match current app'))

          return;
        }

        // ensure access_token is not expired
        if (!Object.prototype.hasOwnProperty.call(tokenInfoResponse.data, 'exp')
          || parseInt(tokenInfoResponse.data.exp) > Date.now()
        ) {
          this.fail(new Error('access_token is expired'))

          return;
        }

        // request user profile fields
        axios.request({
          url: 'https://www.googleapis.com/oauth2/v3/userinfo',
          method: 'post',
          data: `access_token=${request.body.access_token}`,
          headers: {
            'Cache-Control': 'no-cache',
            'Host': 'www.googleapis.com',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
          .then(userInfoResponse => {
            if (!Object.prototype.hasOwnProperty.call(userInfoResponse, 'status')
            || userInfoResponse.status !== 200
            ) {
              this.fail(new Error('Unable to get response from google api'))

              return;
            }


            if (!Object.prototype.hasOwnProperty.call(userInfoResponse, 'data')
            || !userInfoResponse.data
            ) {
              this.fail(new Error('Unable to get response from google api'))

              return;
            }

            if (this._verify) {
              const verified = (error, user, info) => {
                if (error) return this.error(error);
                if (!user) return this.fail(info);

                return this.success(user, info);
              };

              // send back request to kuzzle plugin to verify user
              this._verify(
                request,
                userInfoResponse.data,
                verified
              )
            }
          })
          .catch(_ => {
            this.fail(new Error("profile is invalid"))

          });
      })
      .catch(_ => {
        this.fail(new Error("access_token is invalid"))

      });
  }
}

module.exports = GoogleTokenStrategy;
